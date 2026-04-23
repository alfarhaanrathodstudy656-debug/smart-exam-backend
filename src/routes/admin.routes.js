const express = require('express');
const adminController = require('../controllers/admin.controller');
const authMiddleware = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');
const primaryAdminOnly = require('../middleware/primaryAdmin.middleware');
const validate = require('../middleware/validate.middleware');
const ROLES = require('../constants/roles');
const {
  createTestSchema,
  updateTestSchema,
  testIdParamSchema,
  publishTestSchema,
  questionSchema,
  updateQuestionSchema,
  questionParamSchema,
  reviewAnswerSchema,
  aiGenerateQuestionSchema,
  aiReviewAnswerSchema,
  submissionsQuerySchema,
  studentsQuerySchema,
  exportResultsSchema
} = require('../validations/admin.validation');

const router = express.Router();

router.use(authMiddleware, authorize(ROLES.ADMIN), primaryAdminOnly);

router.get('/dashboard', adminController.getAdminDashboard);

router.post('/tests', validate(createTestSchema), adminController.createTest);
router.get('/tests', adminController.getAllTests);
router.get('/tests/:testId', validate(testIdParamSchema), adminController.getSingleTest);
router.patch('/tests/:testId', validate(updateTestSchema), adminController.updateTest);
router.delete('/tests/:testId', validate(testIdParamSchema), adminController.deleteTest);
router.patch('/tests/:testId/publish', validate(publishTestSchema), adminController.publishOrUnpublishTest);

router.post('/tests/:testId/questions', validate(questionSchema), adminController.addQuestion);
router.post('/tests/:testId/questions/ai-generate', validate(aiGenerateQuestionSchema), adminController.generateQuestionWithAI);
router.patch('/tests/:testId/questions/:questionId', validate(updateQuestionSchema), adminController.editQuestion);
router.delete('/tests/:testId/questions/:questionId', validate(questionParamSchema), adminController.deleteQuestion);

router.get('/submissions', validate(submissionsQuerySchema), adminController.getSubmissions);
router.get('/students', validate(studentsQuerySchema), adminController.getStudents);
router.patch('/submissions/:submissionId/answers/:answerQuestionId/review', validate(reviewAnswerSchema), adminController.reviewAnswer);
router.patch('/submissions/:submissionId/practical/:answerQuestionId/review', validate(reviewAnswerSchema), adminController.reviewAnswer);
router.patch('/submissions/:submissionId/viva/:answerQuestionId/review', validate(reviewAnswerSchema), adminController.reviewAnswer);
router.post('/submissions/:submissionId/answers/:answerQuestionId/ai-review', validate(aiReviewAnswerSchema), adminController.aiReviewAnswer);

router.get('/results/export', validate(exportResultsSchema), adminController.exportResults);
router.get('/analytics/tests/:testId', validate(testIdParamSchema), adminController.getAnalytics);
router.get('/leaderboard/:testId', validate(testIdParamSchema), adminController.getLeaderboard);
router.get('/activity-logs', adminController.getActivityLogs);

module.exports = router;
