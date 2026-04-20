const express = require('express');
const authController = require('../controllers/auth.controller');
const validate = require('../middleware/validate.middleware');
const {
  registerStudentSchema,
  loginSchema,
  googleAuthSchema,
  requestAdminSecurityKeySchema,
  requestPasswordResetOtpSchema,
  resetPasswordWithOtpSchema
} = require('../validations/auth.validation');

const router = express.Router();

router.post('/student/register', validate(registerStudentSchema), authController.registerStudent);
router.post('/student/login', validate(loginSchema), authController.studentLogin);
router.post('/admin/security-key/request', validate(requestAdminSecurityKeySchema), authController.requestAdminSecurityKey);
router.post('/admin/login', validate(loginSchema), authController.adminLogin);

router.post('/google', validate(googleAuthSchema), authController.googleAuth);
router.get('/google/config', authController.googleConfig);

router.post('/student/password/request-otp', validate(requestPasswordResetOtpSchema), authController.requestStudentPasswordResetOtp);
router.post('/student/password/reset-otp', validate(resetPasswordWithOtpSchema), authController.resetStudentPasswordWithOtp);
router.post('/admin/password/request-otp', validate(requestPasswordResetOtpSchema), authController.requestAdminPasswordResetOtp);
router.post('/admin/password/reset-otp', validate(resetPasswordWithOtpSchema), authController.resetAdminPasswordWithOtp);

router.post('/password/request-otp', validate(requestPasswordResetOtpSchema), authController.requestPasswordResetOtp);
router.post('/password/reset-otp', validate(resetPasswordWithOtpSchema), authController.resetPasswordWithOtp);

module.exports = router;
