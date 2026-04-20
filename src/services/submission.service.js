const { StatusCodes } = require('http-status-codes');
const Test = require('../models/Test');
const Question = require('../models/Question');
const Submission = require('../models/Submission');
const AppError = require('../utils/appError');
const SUBMISSION_STATUS = require('../constants/submissionStatus');
const { sanitizeStudentQuestion } = require('../utils/questionMapper');
const { autoEvaluateSubmission } = require('./evaluation.service');
const { getPagination, getPaginationMeta } = require('../utils/pagination');

const shuffleQuestions = (questions) => {
  const shuffled = [...questions];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const getStudentDashboard = async ({ userId }) => {
  const [totalPublishedTests, completedSubmissions, reviewedSubmissions] = await Promise.all([
    Test.countDocuments({ isPublished: true }),
    Submission.find({
      userId,
      status: { $in: [SUBMISSION_STATUS.PENDING_REVIEW, SUBMISSION_STATUS.REVIEWED] }
    })
      .select('totalScore submittedAt status')
      .sort({ submittedAt: -1 })
      .lean(),
    Submission.find({
      userId,
      status: SUBMISSION_STATUS.REVIEWED
    })
      .select('submittedAt')
      .lean()
  ]);

  const completedTests = completedSubmissions.length;
  const upcomingTests = Math.max(0, totalPublishedTests - completedTests);
  const averageScore = completedTests
    ? Number((completedSubmissions.reduce((sum, item) => sum + Number(item.totalScore || 0), 0) / completedTests).toFixed(2))
    : 0;

  const dates = reviewedSubmissions
    .map((item) => item.submittedAt || item.createdAt)
    .filter(Boolean)
    .map((date) => new Date(date).toISOString().slice(0, 10));

  const dateSet = new Set(dates);
  let activeStreak = 0;
  let cursor = new Date();

  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (!dateSet.has(key)) {
      break;
    }
    activeStreak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    upcomingTests,
    completedTests,
    averageScore,
    activeStreak
  };
};

const getAvailableTests = async ({ userId }) => {
  const tests = await Test.find({ isPublished: true })
    .select(
      'title subject description duration totalMarks negativeMarking maxAttemptsPerStudent isPublished createdAt'
    )
    .sort({ createdAt: -1 })
    .lean();

  if (!tests.length) {
    return [];
  }

  const finalizedStatuses = [
    SUBMISSION_STATUS.SUBMITTED,
    SUBMISSION_STATUS.PENDING_REVIEW,
    SUBMISSION_STATUS.REVIEWED
  ];

  const testIds = tests.map((test) => test._id);
  const submissions = await Submission.find({
    userId,
    testId: { $in: testIds }
  })
    .select('testId status')
    .lean();

  const attemptMap = new Map();
  submissions.forEach((submission) => {
    const key = String(submission.testId);
    const current = attemptMap.get(key) || { finalized: 0, inProgress: false };

    if (submission.status === SUBMISSION_STATUS.IN_PROGRESS) {
      current.inProgress = true;
    } else if (finalizedStatuses.includes(submission.status)) {
      current.finalized += 1;
    }

    attemptMap.set(key, current);
  });

  return tests.filter((test) => {
    const key = String(test._id);
    const usage = attemptMap.get(key) || { finalized: 0, inProgress: false };
    const allowedAttempts = Math.max(1, Number(test.maxAttemptsPerStudent || 1));

    if (usage.inProgress) {
      return true;
    }

    return usage.finalized < allowedAttempts;
  });
};

const getTestDetailsForStudent = async ({ testId }) => {
  const test = await Test.findOne({ _id: testId, isPublished: true }).lean();
  if (!test) {
    throw new AppError('Test not found or not published', StatusCodes.NOT_FOUND);
  }

  const questionCount = await Question.countDocuments({ testId });
  return {
    ...test,
    questionCount,
    instructions: [
      'Maintain a stable internet connection throughout the exam.',
      'MCQ questions may apply negative marking if configured.',
      'Practical and viva sections are reviewed manually when needed.',
      'Do not refresh the page while recording viva responses.'
    ]
  };
};

const startTestAttempt = async ({ userId, testId }) => {
  const test = await Test.findOne({ _id: testId, isPublished: true });
  if (!test) {
    throw new AppError('Test not found or unpublished', StatusCodes.NOT_FOUND);
  }

  const allowedAttempts = Math.max(1, Number(test.maxAttemptsPerStudent || 1));
  const existingSubmissions = await Submission.find({ userId, testId }).sort({ createdAt: -1 });
  const inProgressSubmission = existingSubmissions.find(
    (item) => item.status === SUBMISSION_STATUS.IN_PROGRESS
  );
  if (inProgressSubmission) {
    return inProgressSubmission;
  }

  const finalizedSubmissions = existingSubmissions.filter(
    (item) => item.status !== SUBMISSION_STATUS.IN_PROGRESS
  );

  if (finalizedSubmissions.length >= allowedAttempts) {
    throw new AppError(
      `Attempt limit reached. Allowed attempts: ${allowedAttempts}`,
      StatusCodes.BAD_REQUEST
    );
  }

  const lastAttemptNumber = existingSubmissions.reduce((max, item) => {
    const current = Number(item.attemptNumber || 0);
    return current > max ? current : max;
  }, 0);
  const nextAttemptNumber = lastAttemptNumber + 1;

  const questions = await Question.find({ testId }).select('_id type').lean();
  if (!questions.length) {
    throw new AppError('No questions found for this test', StatusCodes.BAD_REQUEST);
  }

  const shuffledQuestions = shuffleQuestions(questions);

  const answers = shuffledQuestions.map((question) => ({
    questionId: question._id,
    type: question.type,
    selectedOption: '',
    writtenAnswer: '',
    audioUrl: '',
    transcript: '',
    score: 0,
    feedback: '',
    isReviewed: question.type === 'mcq'
  }));

  let submission;
  try {
    submission = await Submission.create({
      userId,
      testId,
      status: SUBMISSION_STATUS.IN_PROGRESS,
      attemptNumber: nextAttemptNumber,
      answers,
      totalScore: 0
    });
  } catch (error) {
    // Handle race conditions where two start requests arrive at the same time.
    if (error?.code === 11000) {
      const existing = await Submission.find({ userId, testId }).sort({ createdAt: -1 });
      const inProgress = existing.find((item) => item.status === SUBMISSION_STATUS.IN_PROGRESS);
      if (inProgress) {
        return inProgress;
      }

      const finalizedCount = existing.filter(
        (item) => item.status !== SUBMISSION_STATUS.IN_PROGRESS
      ).length;
      if (finalizedCount >= allowedAttempts) {
        throw new AppError(
          `Attempt limit reached. Allowed attempts: ${allowedAttempts}`,
          StatusCodes.BAD_REQUEST
        );
      }

      if (existing[0]) {
        return existing[0];
      }
    }
    throw error;
  }

  return submission;
};

const getStudentQuestions = async ({ testId, userId }) => {
  const attempts = await Submission.find({ testId, userId }).sort({ createdAt: -1 });
  const submission = attempts.find((item) => item.status === SUBMISSION_STATUS.IN_PROGRESS) || attempts[0];
  if (!submission) {
    throw new AppError('Please start test before fetching questions', StatusCodes.BAD_REQUEST);
  }

  if (submission.status !== SUBMISSION_STATUS.IN_PROGRESS) {
    throw new AppError(
      'No active test attempt found. Start a new attempt if attempts are remaining.',
      StatusCodes.BAD_REQUEST
    );
  }

  const orderedQuestionIds = submission.answers.map((answer) => answer.questionId);
  if (!orderedQuestionIds.length) {
    return [];
  }

  const questions = await Question.find({
    _id: { $in: orderedQuestionIds },
    testId
  }).lean();

  const questionMap = new Map(questions.map((question) => [String(question._id), question]));
  const orderedQuestions = orderedQuestionIds
    .map((questionId) => questionMap.get(String(questionId)))
    .filter(Boolean);

  return orderedQuestions.map(sanitizeStudentQuestion);
};

const saveAnswer = async ({ submissionId, userId, payload }) => {
  const submission = await Submission.findOne({ _id: submissionId, userId });
  if (!submission) {
    throw new AppError('Submission not found', StatusCodes.NOT_FOUND);
  }

  if (submission.status !== SUBMISSION_STATUS.IN_PROGRESS) {
    throw new AppError('Cannot update answers after final submission', StatusCodes.BAD_REQUEST);
  }

  const question = await Question.findById(payload.questionId).lean();
  if (!question || String(question.testId) !== String(submission.testId)) {
    throw new AppError('Question does not belong to this submission test', StatusCodes.BAD_REQUEST);
  }

  const answer = submission.answers.find((item) => String(item.questionId) === String(payload.questionId));
  if (!answer) {
    throw new AppError('Question not part of this test attempt', StatusCodes.BAD_REQUEST);
  }

  answer.type = question.type;
  answer.selectedOption = question.type === 'mcq' ? (payload.selectedOption || '') : '';
  answer.writtenAnswer = question.type === 'practical' ? (payload.writtenAnswer || '') : answer.writtenAnswer || '';
  answer.audioUrl = question.type === 'viva' ? (payload.audioUrl || answer.audioUrl || '') : '';
  answer.transcript = question.type === 'viva' ? (payload.transcript || answer.transcript || '') : '';



  await submission.save();

  return {
    submissionId: submission._id,
    autoSaved: Boolean(payload.autoSave),
    status: submission.status,
    updatedAt: submission.updatedAt
  };
};

const attachVivaAudio = async ({ submissionId, userId, questionId, audioUrl, transcript = '' }) => {
  const submission = await Submission.findOne({ _id: submissionId, userId });
  if (!submission) {
    throw new AppError('Submission not found', StatusCodes.NOT_FOUND);
  }

  if (submission.status !== SUBMISSION_STATUS.IN_PROGRESS) {
    throw new AppError('Cannot upload audio after final submission', StatusCodes.BAD_REQUEST);
  }

  const answer = submission.answers.find((item) => String(item.questionId) === String(questionId));
  if (!answer) {
    throw new AppError('Answer slot not found for question', StatusCodes.NOT_FOUND);
  }

  if (answer.type !== 'viva') {
    throw new AppError('Audio upload allowed only for viva answers', StatusCodes.BAD_REQUEST);
  }

  answer.audioUrl = audioUrl;
  if (transcript) {
    answer.transcript = transcript;
  }

  await submission.save();
  return answer;
};

const submitFinalTest = async ({ submissionId, userId }) => {
  const submission = await Submission.findOne({ _id: submissionId, userId });
  if (!submission) {
    throw new AppError('Submission not found', StatusCodes.NOT_FOUND);
  }

  if (submission.status !== SUBMISSION_STATUS.IN_PROGRESS) {
    throw new AppError('Submission already finalized', StatusCodes.BAD_REQUEST);
  }

  const test = await Test.findById(submission.testId).lean();
  if (!test) {
    throw new AppError('Associated test not found', StatusCodes.NOT_FOUND);
  }

  const questions = await Question.find({ testId: submission.testId }).lean();
  const { totalScore, pendingManualReview } = autoEvaluateSubmission({
    submission,
    questions,
    negativeMarking: Number(test.negativeMarking || 0)
  });

  submission.totalScore = totalScore;
  submission.submittedAt = new Date();
  submission.status = pendingManualReview
    ? SUBMISSION_STATUS.PENDING_REVIEW
    : SUBMISSION_STATUS.REVIEWED;

  await submission.save();
  return submission;
};

const getSubmissionByIdForStudent = async ({ submissionId, userId }) => {
  const submission = await Submission.findOne({ _id: submissionId, userId })
    .populate('testId', 'title subject totalMarks duration')
    .lean();

  if (!submission) {
    throw new AppError('Submission not found', StatusCodes.NOT_FOUND);
  }

  return submission;
};

const getSubmissionHistoryForStudent = async ({ userId, query }) => {
  const { page, limit, skip } = getPagination(query);
  const filters = { userId };
  if (query.status) {
    filters.status = query.status;
  }

  const [items, total] = await Promise.all([
    Submission.find(filters)
      .populate('testId', 'title subject totalMarks')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Submission.countDocuments(filters)
  ]);

  return {
    items,
    meta: getPaginationMeta({ page, limit, total })
  };
};

module.exports = {
  getStudentDashboard,
  getAvailableTests,
  getTestDetailsForStudent,
  startTestAttempt,
  getStudentQuestions,
  saveAnswer,
  attachVivaAudio,
  submitFinalTest,
  getSubmissionByIdForStudent,
  getSubmissionHistoryForStudent
};




