const express = require('express');
const studentController = require('../controllers/student.controller');
const authMiddleware = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');
const upload = require('../middleware/upload.middleware');
const ROLES = require('../constants/roles');
const {
  testIdParamSchema,
  saveAnswerSchema,
  uploadAudioSchema,
  submissionIdParamSchema,
  resultSummarySchema,
  historyQuerySchema
} = require('../validations/student.validation');

const router = express.Router();

router.use(authMiddleware, authorize(ROLES.STUDENT));

router.get('/dashboard', studentController.getDashboard);
router.get('/tests', studentController.getAvailableTests);
router.get('/tests/:testId', validate(testIdParamSchema), studentController.getTestDetails);
router.post('/tests/:testId/start', validate(testIdParamSchema), studentController.startTest);
router.get('/tests/:testId/questions', validate(testIdParamSchema), studentController.getQuestions);
router.get('/tests/:testId/leaderboard', validate(testIdParamSchema), studentController.getLeaderboard);

router.post('/submissions/:submissionId/answers/save', validate(saveAnswerSchema), studentController.saveAnswer);
router.post('/submissions/:submissionId/answers/autosave', validate(saveAnswerSchema), studentController.saveAnswer);

router.post(
  '/submissions/:submissionId/answers/:questionId/audio',
  upload.single('audio'),
  validate(uploadAudioSchema),
  studentController.uploadVivaAudio
);

router.post('/submissions/:submissionId/submit', validate(submissionIdParamSchema), studentController.submitTest);
router.get('/submissions/:submissionId/result', validate(resultSummarySchema), studentController.getResultSummary);
router.get('/submissions/history', validate(historyQuerySchema), studentController.getSubmissionHistory);

module.exports = router;
