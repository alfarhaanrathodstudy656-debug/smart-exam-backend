const path = require('path');
const { StatusCodes } = require('http-status-codes');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');
const submissionService = require('../services/submission.service');
const { buildResultSummary } = require('../services/evaluation.service');
const { logActivity } = require('../services/activityLog.service');
const adminService = require('../services/admin.service');
const openaiService = require('../services/openai.service');
const AppError = require('../utils/appError');

const getDashboard = asyncHandler(async (req, res) => {
  const dashboard = await submissionService.getStudentDashboard({ userId: req.user.id });
  return successResponse(res, {
    message: 'Student dashboard fetched successfully',
    data: dashboard
  });
});

const getAvailableTests = asyncHandler(async (req, res) => {
  const tests = await submissionService.getAvailableTests({ userId: req.user.id });
  return successResponse(res, {
    message: 'Published tests fetched successfully',
    data: tests
  });
});

const getTestDetails = asyncHandler(async (req, res) => {
  const test = await submissionService.getTestDetailsForStudent({ testId: req.params.testId });
  return successResponse(res, {
    message: 'Test details fetched successfully',
    data: test
  });
});

const startTest = asyncHandler(async (req, res) => {
  const submission = await submissionService.startTestAttempt({
    userId: req.user.id,
    testId: req.params.testId
  });

  await logActivity({
    actorId: req.user.id,
    role: req.user.role,
    action: 'test_started',
    entityType: 'Submission',
    entityId: submission._id,
    metadata: { testId: req.params.testId }
  });

  return successResponse(res, {
    statusCode: StatusCodes.CREATED,
    message: 'Test started successfully',
    data: submission
  });
});

const getQuestions = asyncHandler(async (req, res) => {
  const questions = await submissionService.getStudentQuestions({
    testId: req.params.testId,
    userId: req.user.id
  });

  return successResponse(res, {
    message: 'Questions fetched successfully',
    data: questions
  });
});

const saveAnswer = asyncHandler(async (req, res) => {
  const result = await submissionService.saveAnswer({
    submissionId: req.params.submissionId,
    userId: req.user.id,
    payload: req.body
  });

  return successResponse(res, {
    message: req.body.autoSave ? 'Answer auto-saved' : 'Answer saved',
    data: result
  });
});

const uploadVivaAudio = asyncHandler(async (req, res) => {
  const filePath = req.file
    ? `/uploads/viva/${path.basename(req.file.path)}`
    : req.body.audioUrl;

  if (!filePath) {
    throw new AppError('Provide audio file upload or audioUrl reference', StatusCodes.BAD_REQUEST);
  }

  let transcript = req.body.transcript || '';
  const transcriptionMeta = {
    source: transcript ? 'client' : 'service',
    transcribed: Boolean(transcript),
    error: ''
  };

  if (!transcript && req.file) {
    try {
      transcript = await openaiService.transcribeAudioFile({
        filePath: req.file.path,
        language: req.body.language || 'en'
      });

      transcriptionMeta.transcribed = Boolean(transcript);
    } catch (error) {
      transcriptionMeta.error = error?.message || 'Transcription failed';
    }
  }

  const answer = await submissionService.attachVivaAudio({
    submissionId: req.params.submissionId,
    userId: req.user.id,
    questionId: req.params.questionId,
    audioUrl: filePath,
    transcript
  });

  const answerData = typeof answer?.toObject === 'function' ? answer.toObject() : answer;

  return successResponse(res, {
    message: 'Viva audio attached successfully',
    data: {
      ...answerData,
      transcriptionMeta
    }
  });
});

const submitTest = asyncHandler(async (req, res) => {
  const submission = await submissionService.submitFinalTest({
    submissionId: req.params.submissionId,
    userId: req.user.id
  });

  await logActivity({
    actorId: req.user.id,
    role: req.user.role,
    action: 'test_submitted',
    entityType: 'Submission',
    entityId: submission._id,
    metadata: { status: submission.status, score: submission.totalScore }
  });

  return successResponse(res, {
    message: 'Test submitted successfully',
    data: submission
  });
});

const getResultSummary = asyncHandler(async (req, res) => {
  const submission = await submissionService.getSubmissionByIdForStudent({
    submissionId: req.params.submissionId,
    userId: req.user.id
  });

  const summary = await buildResultSummary({ submission });
  return successResponse(res, {
    message: 'Result summary fetched successfully',
    data: {
      ...summary,
      test: submission.testId
    }
  });
});

const getSubmissionHistory = asyncHandler(async (req, res) => {
  const result = await submissionService.getSubmissionHistoryForStudent({
    userId: req.user.id,
    query: req.query
  });

  return successResponse(res, {
    message: 'Submission history fetched successfully',
    data: result.items,
    meta: result.meta
  });
});

const getLeaderboard = asyncHandler(async (req, res) => {
  const items = await adminService.getLeaderboard({
    testId: req.params.testId,
    limit: Number(req.query.limit || 10)
  });

  return successResponse(res, {
    message: 'Leaderboard fetched successfully',
    data: items
  });
});

module.exports = {
  getDashboard,
  getAvailableTests,
  getTestDetails,
  startTest,
  getQuestions,
  saveAnswer,
  uploadVivaAudio,
  submitTest,
  getResultSummary,
  getSubmissionHistory,
  getLeaderboard
};
