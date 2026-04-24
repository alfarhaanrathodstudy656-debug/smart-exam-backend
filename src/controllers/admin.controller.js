const { StatusCodes } = require('http-status-codes');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');
const adminService = require('../services/admin.service');
const { generateCSVBuffer, generatePDFBuffer } = require('../services/export.service');
const { logActivity } = require('../services/activityLog.service');

const createTest = asyncHandler(async (req, res) => {
  const test = await adminService.createTest({
    payload: req.body,
    adminId: req.user.id
  });

  await logActivity({
    actorId: req.user.id,
    role: req.user.role,
    action: 'test_created',
    entityType: 'Test',
    entityId: test._id,
    metadata: { title: test.title }
  });

  return successResponse(res, {
    statusCode: StatusCodes.CREATED,
    message: 'Test created successfully',
    data: test
  });
});

const updateTest = asyncHandler(async (req, res) => {
  const test = await adminService.updateTest({
    testId: req.params.testId,
    payload: req.body
  });

  await logActivity({
    actorId: req.user.id,
    role: req.user.role,
    action: 'test_updated',
    entityType: 'Test',
    entityId: test._id
  });

  return successResponse(res, {
    message: 'Test updated successfully',
    data: test
  });
});

const deleteTest = asyncHandler(async (req, res) => {
  const test = await adminService.deleteTest({ testId: req.params.testId });

  await logActivity({
    actorId: req.user.id,
    role: req.user.role,
    action: 'test_deleted',
    entityType: 'Test',
    entityId: test._id
  });

  return successResponse(res, {
    message: 'Test deleted successfully',
    data: { testId: test._id }
  });
});

const publishOrUnpublishTest = asyncHandler(async (req, res) => {
  const test = await adminService.setTestPublishStatus({
    testId: req.params.testId,
    isPublished: req.body.isPublished
  });

  await logActivity({
    actorId: req.user.id,
    role: req.user.role,
    action: req.body.isPublished ? 'test_published' : 'test_unpublished',
    entityType: 'Test',
    entityId: test._id
  });

  return successResponse(res, {
    message: `Test ${req.body.isPublished ? 'published' : 'unpublished'} successfully`,
    data: test
  });
});

const getAllTests = asyncHandler(async (_req, res) => {
  const tests = await adminService.listTests();
  return successResponse(res, {
    message: 'Tests fetched successfully',
    data: tests
  });
});

const getSingleTest = asyncHandler(async (req, res) => {
  const test = await adminService.getSingleTest({ testId: req.params.testId });
  return successResponse(res, {
    message: 'Test details fetched successfully',
    data: test
  });
});

const addQuestion = asyncHandler(async (req, res) => {
  const question = await adminService.addQuestionToTest({
    testId: req.params.testId,
    payload: req.body
  });

  await logActivity({
    actorId: req.user.id,
    role: req.user.role,
    action: 'question_added',
    entityType: 'Question',
    entityId: question._id,
    metadata: { testId: req.params.testId, type: question.type }
  });

  return successResponse(res, {
    statusCode: StatusCodes.CREATED,
    message: 'Question added successfully',
    data: question
  });
});

const generateQuestionWithAI = asyncHandler(async (req, res) => {
  const draft = await adminService.generateQuestionWithAI({
    testId: req.params.testId,
    payload: req.body
  });

  await logActivity({
    actorId: req.user.id,
    role: req.user.role,
    action: 'question_draft_generated_ai',
    entityType: 'Test',
    entityId: req.params.testId,
    metadata: { type: req.body.type, difficulty: req.body.difficulty || 'medium' }
  });

  return successResponse(res, {
    message: 'AI draft generated successfully',
    data: draft
  });
});

const editQuestion = asyncHandler(async (req, res) => {
  const question = await adminService.editQuestion({
    testId: req.params.testId,
    questionId: req.params.questionId,
    payload: req.body
  });

  await logActivity({
    actorId: req.user.id,
    role: req.user.role,
    action: 'question_updated',
    entityType: 'Question',
    entityId: question._id
  });

  return successResponse(res, {
    message: 'Question updated successfully',
    data: question
  });
});

const deleteQuestion = asyncHandler(async (req, res) => {
  const question = await adminService.deleteQuestion({
    testId: req.params.testId,
    questionId: req.params.questionId
  });

  await logActivity({
    actorId: req.user.id,
    role: req.user.role,
    action: 'question_deleted',
    entityType: 'Question',
    entityId: question._id
  });

  return successResponse(res, {
    message: 'Question deleted successfully',
    data: { questionId: question._id }
  });
});

const getSubmissions = asyncHandler(async (req, res) => {
  const result = await adminService.getStudentSubmissions({ query: req.query });

  return successResponse(res, {
    message: 'Submissions fetched successfully',
    data: result.items,
    meta: result.meta
  });
});

const getStudents = asyncHandler(async (req, res) => {
  const result = await adminService.listStudents({ query: req.query });

  return successResponse(res, {
    message: 'Students fetched successfully',
    data: result.items,
    meta: result.meta
  });
});

const deleteStudent = asyncHandler(async (req, res) => {
  const result = await adminService.deleteStudentById({
    studentId: req.params.studentId,
    actorId: req.user.id
  });

  await logActivity({
    actorId: req.user.id,
    role: req.user.role,
    action: 'student_deleted',
    entityType: 'User',
    entityId: req.params.studentId,
    metadata: {
      studentEmail: result.studentEmail,
      deletedSubmissions: result.deletedSubmissions
    }
  });

  return successResponse(res, {
    message: 'Student deleted successfully',
    data: result
  });
});

const reviewAnswer = asyncHandler(async (req, res) => {
  const submission = await adminService.reviewAnswer({
    submissionId: req.params.submissionId,
    answerQuestionId: req.params.answerQuestionId,
    ...req.body
  });

  await logActivity({
    actorId: req.user.id,
    role: req.user.role,
    action: 'answer_reviewed',
    entityType: 'Submission',
    entityId: submission._id,
    metadata: { answerQuestionId: req.params.answerQuestionId, score: req.body.score }
  });

  return successResponse(res, {
    message: 'Answer reviewed successfully',
    data: submission
  });
});

const aiReviewAnswer = asyncHandler(async (req, res) => {
  const suggestion = await adminService.aiReviewAnswer({
    submissionId: req.params.submissionId,
    answerQuestionId: req.params.answerQuestionId,
    ...req.body
  });

  await logActivity({
    actorId: req.user.id,
    role: req.user.role,
    action: 'answer_ai_review_suggested',
    entityType: 'Submission',
    entityId: req.params.submissionId,
    metadata: {
      answerQuestionId: req.params.answerQuestionId,
      suggestedScore: suggestion.suggestedScore,
      scoringStyle: req.body.scoringStyle || 'balanced'
    }
  });

  return successResponse(res, {
    message: 'AI review suggestion generated successfully',
    data: suggestion
  });
});

const exportResults = asyncHandler(async (req, res) => {
  const rows = await adminService.resultsDataForExport({
    testId: req.query.testId
  });

  const format = req.query.format || 'csv';
  if (format === 'pdf') {
    const buffer = await generatePDFBuffer(rows);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="results-export.pdf"');
    return res.status(StatusCodes.OK).send(buffer);
  }

  const csvBuffer = generateCSVBuffer(rows);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="results-export.csv"');
  return res.status(StatusCodes.OK).send(csvBuffer);
});

const getAnalytics = asyncHandler(async (req, res) => {
  const analytics = await adminService.getTestAnalytics({ testId: req.params.testId });
  return successResponse(res, {
    message: 'Test analytics fetched successfully',
    data: analytics
  });
});

const getAdminDashboard = asyncHandler(async (_req, res) => {
  const stats = await adminService.getAdminOverviewStats();
  return successResponse(res, {
    message: 'Admin dashboard stats fetched successfully',
    data: stats
  });
});

const getActivityLogs = asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit || 30);
  const logs = await adminService.getRecentActivityLogs({ limit });
  return successResponse(res, {
    message: 'Activity logs fetched successfully',
    data: logs
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
  createTest,
  updateTest,
  deleteTest,
  publishOrUnpublishTest,
  getAllTests,
  getSingleTest,
  addQuestion,
  generateQuestionWithAI,
  editQuestion,
  deleteQuestion,
  getSubmissions,
  getStudents,
  deleteStudent,
  reviewAnswer,
  aiReviewAnswer,
  exportResults,
  getAnalytics,
  getAdminDashboard,
  getActivityLogs,
  getLeaderboard
};
