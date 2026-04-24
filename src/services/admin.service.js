const { StatusCodes } = require('http-status-codes');
const Test = require('../models/Test');
const Question = require('../models/Question');
const Submission = require('../models/Submission');
const User = require('../models/User');
const AppError = require('../utils/appError');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const SUBMISSION_STATUS = require('../constants/submissionStatus');
const openaiService = require('./openai.service');

const clampNumber = (value, min, max) => Math.min(max, Math.max(min, value));

const createTest = async ({ payload, adminId }) => Test.create({
  ...payload,
  createdBy: adminId
});

const updateTest = async ({ testId, payload }) => {
  const test = await Test.findByIdAndUpdate(testId, payload, { new: true, runValidators: true });
  if (!test) {
    throw new AppError('Test not found', StatusCodes.NOT_FOUND);
  }
  return test;
};

const deleteTest = async ({ testId }) => {
  const test = await Test.findByIdAndDelete(testId);
  if (!test) {
    throw new AppError('Test not found', StatusCodes.NOT_FOUND);
  }

  await Promise.all([
    Question.deleteMany({ testId }),
    Submission.deleteMany({ testId })
  ]);

  return test;
};

const setTestPublishStatus = async ({ testId, isPublished }) => {
  const test = await Test.findByIdAndUpdate(testId, { isPublished }, { new: true });
  if (!test) {
    throw new AppError('Test not found', StatusCodes.NOT_FOUND);
  }

  return test;
};

const listTests = async () => Test.find().populate('createdBy', 'name email').sort({ createdAt: -1 }).lean();

const getSingleTest = async ({ testId }) => {
  const [test, questionCount] = await Promise.all([
    Test.findById(testId).populate('createdBy', 'name email').lean(),
    Question.countDocuments({ testId })
  ]);

  if (!test) {
    throw new AppError('Test not found', StatusCodes.NOT_FOUND);
  }

  return {
    ...test,
    questionCount
  };
};

const addQuestionToTest = async ({ testId, payload }) => {
  const testExists = await Test.exists({ _id: testId });
  if (!testExists) {
    throw new AppError('Test not found', StatusCodes.NOT_FOUND);
  }

  const question = await Question.create({
    ...payload,
    testId
  });

  return question;
};

const generateQuestionWithAI = async ({ testId, payload }) => {
  const test = await Test.findById(testId).lean();
  if (!test) {
    throw new AppError('Test not found', StatusCodes.NOT_FOUND);
  }

  const generatedQuestion = await openaiService.generateQuestionDraft({
    subject: test.subject,
    testTitle: test.title,
    testDescription: test.description,
    type: payload.type,
    topic: payload.topic,
    difficulty: payload.difficulty,
    marks: payload.marks || 5,
    additionalInstructions: payload.additionalInstructions || ''
  });

  return generatedQuestion;
};

const editQuestion = async ({ testId, questionId, payload }) => {
  const question = await Question.findOneAndUpdate(
    { _id: questionId, testId },
    payload,
    { new: true, runValidators: true }
  );

  if (!question) {
    throw new AppError('Question not found for test', StatusCodes.NOT_FOUND);
  }

  return question;
};

const deleteQuestion = async ({ testId, questionId }) => {
  const question = await Question.findOneAndDelete({ _id: questionId, testId });
  if (!question) {
    throw new AppError('Question not found for test', StatusCodes.NOT_FOUND);
  }

  await Submission.updateMany(
    { testId },
    { $pull: { answers: { questionId } } }
  );

  return question;
};

const getStudentSubmissions = async ({ query }) => {
  const { page, limit, skip } = getPagination(query);
  const filters = {};
  if (query.testId) {
    filters.testId = query.testId;
  }
  if (query.studentId) {
    filters.userId = query.studentId;
  }
  if (query.status) {
    filters.status = query.status;
  }

  const [items, total] = await Promise.all([
    Submission.find(filters)
      .populate('userId', 'name email')
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

const listStudents = async ({ query }) => {
  const { page, limit, skip } = getPagination(query);
  const filters = { role: 'student' };

  const search = String(query.search || '').trim();
  if (search) {
    filters.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const [items, total] = await Promise.all([
    User.find(filters)
      .select('name email createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filters)
  ]);

  return {
    items,
    meta: getPaginationMeta({ page, limit, total })
  };
};

const deleteStudentById = async ({ studentId, actorId }) => {
  const student = await User.findOne({ _id: studentId, role: 'student' }).lean();
  if (!student) {
    throw new AppError('Student not found', StatusCodes.NOT_FOUND);
  }

  if (String(studentId) === String(actorId)) {
    throw new AppError('You cannot delete your own account from this action.', StatusCodes.BAD_REQUEST);
  }

  const submissionsDeleteResult = await Submission.deleteMany({ userId: studentId });
  await User.deleteOne({ _id: studentId });

  return {
    studentId: String(studentId),
    studentEmail: student.email,
    deletedSubmissions: Number(submissionsDeleteResult?.deletedCount || 0)
  };
};

const reviewAnswer = async ({ submissionId, answerQuestionId, score, feedback = '', isReviewed = true }) => {
  const submission = await Submission.findById(submissionId);
  if (!submission) {
    throw new AppError('Submission not found', StatusCodes.NOT_FOUND);
  }

  const answer = submission.answers.find((item) => String(item.questionId) === String(answerQuestionId));
  if (!answer) {
    throw new AppError('Answer not found for this submission', StatusCodes.NOT_FOUND);
  }

  if (!['practical', 'viva'].includes(answer.type)) {
    throw new AppError('Manual review is only for practical/viva answers', StatusCodes.BAD_REQUEST);
  }

  const question = await Question.findById(answer.questionId).lean();
  if (!question) {
    throw new AppError('Question not found', StatusCodes.NOT_FOUND);
  }

  if (score > question.marks) {
    throw new AppError(`Score cannot exceed max marks (${question.marks})`, StatusCodes.BAD_REQUEST);
  }

  answer.score = score;
  answer.feedback = feedback;
  answer.isReviewed = isReviewed;

  const totalScore = submission.answers.reduce((sum, item) => sum + Number(item.score || 0), 0);
  submission.totalScore = Math.max(0, Number(totalScore.toFixed(2)));

  const hasPendingReview = submission.answers.some((item) =>
    ['practical', 'viva'].includes(item.type) && !item.isReviewed
  );

  if (submission.status !== SUBMISSION_STATUS.IN_PROGRESS) {
    submission.status = hasPendingReview
      ? SUBMISSION_STATUS.PENDING_REVIEW
      : SUBMISSION_STATUS.REVIEWED;
  }

  await submission.save();
  return submission;
};

const aiReviewAnswer = async ({ submissionId, answerQuestionId, scoringStyle = 'balanced', rubric = '' }) => {
  const submission = await Submission.findById(submissionId).lean();
  if (!submission) {
    throw new AppError('Submission not found', StatusCodes.NOT_FOUND);
  }

  const answer = submission.answers.find((item) => String(item.questionId) === String(answerQuestionId));
  if (!answer) {
    throw new AppError('Answer not found for this submission', StatusCodes.NOT_FOUND);
  }

  if (!['practical', 'viva'].includes(answer.type)) {
    throw new AppError('AI review is available only for practical/viva answers', StatusCodes.BAD_REQUEST);
  }

  // Viva must be reviewed manually by admin only.
  if (answer.type === 'viva') {
    throw new AppError('Viva answers require manual admin review only', StatusCodes.BAD_REQUEST);
  }

  const question = await Question.findById(answer.questionId).lean();
  if (!question) {
    throw new AppError('Question not found', StatusCodes.NOT_FOUND);
  }

  const answerBody = answer.type === 'viva'
    ? String(answer.transcript || '').trim()
    : String(answer.writtenAnswer || '').trim();

  if (!answerBody) {
    throw new AppError('Answer content is empty. Save student response before AI review.', StatusCodes.BAD_REQUEST);
  }

  const suggestion = await openaiService.suggestAnswerReview({
    type: answer.type,
    questionText: question.questionText,
    expectedAnswer: question.expectedAnswer,
    keywords: question.keywords,
    studentAnswer: answer.type === 'practical' ? answerBody : '',
    transcript: answer.type === 'viva' ? answerBody : '',
    maxScore: Number(question.marks || 0),
    scoringStyle,
    rubric
  });

  return {
    submissionId: submission._id,
    answerQuestionId,
    questionId: question._id,
    type: answer.type,
    maxScore: question.marks,
    currentScore: Number(answer.score || 0),
    suggestedScore: clampNumber(Number(suggestion.suggestedScore || 0), 0, Number(question.marks || 0)),
    feedback: suggestion.feedback,
    strengths: suggestion.strengths,
    improvements: suggestion.improvements,
    confidence: suggestion.confidence,
    scoringStyle
  };
};

const getTestAnalytics = async ({ testId }) => {
  const [test, submissions, questionStats] = await Promise.all([
    Test.findById(testId).lean(),
    Submission.find({ testId }).populate('userId', 'name email').lean(),
    Question.find({ testId }).lean()
  ]);

  if (!test) {
    throw new AppError('Test not found', StatusCodes.NOT_FOUND);
  }

  const totalSubmissions = submissions.length;
  const completedCount = submissions.filter((item) => item.status !== SUBMISSION_STATUS.IN_PROGRESS).length;
  const reviewedCount = submissions.filter((item) => item.status === SUBMISSION_STATUS.REVIEWED).length;
  const averageScore = totalSubmissions
    ? Number((submissions.reduce((sum, item) => sum + Number(item.totalScore || 0), 0) / totalSubmissions).toFixed(2))
    : 0;

  const mcqQuestionIds = questionStats.filter((q) => q.type === 'mcq').map((q) => String(q._id));
  const mcqAccuracyMap = {};

  mcqQuestionIds.forEach((id) => {
    mcqAccuracyMap[id] = { attempts: 0, correct: 0 };
  });

  submissions.forEach((submission) => {
    submission.answers.forEach((answer) => {
      const key = String(answer.questionId);
      if (!(key in mcqAccuracyMap)) {
        return;
      }
      mcqAccuracyMap[key].attempts += 1;
      if (Number(answer.score || 0) > 0) {
        mcqAccuracyMap[key].correct += 1;
      }
    });
  });

  const mcqAccuracy = questionStats
    .filter((q) => q.type === 'mcq')
    .map((q) => {
      const tracked = mcqAccuracyMap[String(q._id)] || { attempts: 0, correct: 0 };
      const accuracy = tracked.attempts
        ? Number(((tracked.correct / tracked.attempts) * 100).toFixed(2))
        : 0;

      return {
        questionId: q._id,
        questionText: q.questionText,
        accuracy,
        attempts: tracked.attempts
      };
    });

  return {
    test: {
      _id: test._id,
      title: test.title,
      subject: test.subject,
      totalMarks: test.totalMarks
    },
    summary: {
      totalSubmissions,
      completedCount,
      reviewedCount,
      averageScore,
      completionRate: totalSubmissions ? Number(((completedCount / totalSubmissions) * 100).toFixed(2)) : 0
    },
    mcqAccuracy
  };
};

const getLeaderboard = async ({ testId, limit = 10 }) => {
  const items = await Submission.find({
    testId,
    status: { $in: [SUBMISSION_STATUS.PENDING_REVIEW, SUBMISSION_STATUS.REVIEWED] }
  })
    .populate('userId', 'name email')
    .sort({ totalScore: -1, submittedAt: 1 })
    .limit(limit)
    .lean();

  return items.map((item, index) => ({
    rank: index + 1,
    studentId: item.userId?._id,
    name: item.userId?.name,
    email: item.userId?.email,
    totalScore: item.totalScore,
    status: item.status
  }));
};

const resultsDataForExport = async ({ testId }) => {
  const filters = testId ? { testId } : {};

  const items = await Submission.find(filters)
    .populate('userId', 'name email')
    .populate('testId', 'title subject totalMarks')
    .sort({ createdAt: -1 })
    .lean();

  return items.map((item) => ({
    submissionId: String(item._id),
    testTitle: item.testId?.title || '-',
    subject: item.testId?.subject || '-',
    studentName: item.userId?.name || '-',
    studentEmail: item.userId?.email || '-',
    status: item.status,
    totalScore: item.totalScore,
    submittedAt: item.submittedAt ? new Date(item.submittedAt).toISOString() : '-',
    answerCount: item.answers?.length || 0
  }));
};

const getRecentActivityLogs = async ({ limit = 30 }) => {
  const logs = await require('../models/ActivityLog')
    .find()
    .populate('actorId', 'name email role')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return logs;
};

const getAdminOverviewStats = async () => {
  const activeSince = new Date();
  activeSince.setDate(activeSince.getDate() - 7);

  const [totalStudents, totalTests, activeStudentsData, pendingEvaluations, averagePassData] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    Test.countDocuments({ isPublished: true }),
    Submission.aggregate([
      {
        $match: {
          $or: [
            { status: SUBMISSION_STATUS.IN_PROGRESS },
            { updatedAt: { $gte: activeSince } }
          ]
        }
      },
      { $group: { _id: '$userId' } },
      { $count: 'total' }
    ]),
    Submission.countDocuments({ status: SUBMISSION_STATUS.PENDING_REVIEW }),
    Submission.aggregate([
      { $match: { status: { $in: [SUBMISSION_STATUS.PENDING_REVIEW, SUBMISSION_STATUS.REVIEWED] } } },
      { $group: { _id: null, avg: { $avg: '$totalScore' } } }
    ])
  ]);

  const activeStudents = Number(activeStudentsData[0]?.total || 0);
  const averagePassRate = averagePassData[0]?.avg ? Number(averagePassData[0].avg.toFixed(2)) : 0;

  return {
    totalStudents,
    activeStudents,
    totalTests,
    pendingEvaluations,
    averagePassRate
  };
};

module.exports = {
  createTest,
  updateTest,
  deleteTest,
  setTestPublishStatus,
  listTests,
  getSingleTest,
  addQuestionToTest,
  generateQuestionWithAI,
  editQuestion,
  deleteQuestion,
  getStudentSubmissions,
  listStudents,
  deleteStudentById,
  reviewAnswer,
  aiReviewAnswer,
  getTestAnalytics,
  getLeaderboard,
  resultsDataForExport,
  getRecentActivityLogs,
  getAdminOverviewStats
};
