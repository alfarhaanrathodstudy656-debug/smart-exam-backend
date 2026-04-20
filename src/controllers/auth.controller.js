const { StatusCodes } = require('http-status-codes');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');
const authService = require('../services/auth.service');
const ROLES = require('../constants/roles');
const { logActivity } = require('../services/activityLog.service');

const registerStudent = asyncHandler(async (req, res) => {
  const result = await authService.registerStudent(req.body);

  await logActivity({
    actorId: result.user._id,
    role: ROLES.STUDENT,
    action: 'student_registered',
    entityType: 'User',
    entityId: result.user._id
  });

  return successResponse(res, {
    statusCode: StatusCodes.CREATED,
    message: 'Student registered successfully',
    data: result
  });
});

const studentLogin = asyncHandler(async (req, res) => {
  const result = await authService.loginByRole({
    ...req.body,
    role: ROLES.STUDENT
  });

  await logActivity({
    actorId: result.user._id,
    role: ROLES.STUDENT,
    action: 'student_logged_in',
    entityType: 'User',
    entityId: result.user._id
  });

  return successResponse(res, {
    message: 'Student login successful',
    data: result
  });
});

const adminLogin = asyncHandler(async (req, res) => {
  const result = await authService.loginByRole({
    ...req.body,
    role: ROLES.ADMIN
  });

  await logActivity({
    actorId: result.user._id,
    role: ROLES.ADMIN,
    action: 'admin_logged_in',
    entityType: 'User',
    entityId: result.user._id
  });

  return successResponse(res, {
    message: 'Admin login successful',
    data: result
  });
});

const requestAdminSecurityKey = asyncHandler(async (req, res) => {
  const result = await authService.requestAdminLoginSecurityKey(req.body);

  return successResponse(res, {
    message: 'Admin security key generated and sent if email service is configured.',
    data: result
  });
});

const googleAuth = asyncHandler(async (req, res) => {
  const result = await authService.handleGoogleAuth(req.body);

  await logActivity({
    actorId: result.user._id,
    role: result.user.role,
    action: `google_${req.body.intent || 'login'}`,
    entityType: 'User',
    entityId: result.user._id,
    metadata: { role: req.body.role }
  });

  return successResponse(res, {
    message: 'Google authentication successful',
    data: result
  });
});

const googleConfig = asyncHandler(async (_req, res) => {
  const config = authService.getGooglePublicConfig();

  return successResponse(res, {
    message: config.configured
      ? 'Google auth is configured'
      : 'Google auth is not configured',
    data: config
  });
});

const sendPasswordOtpResponse = (res, result) => successResponse(res, {
  message: 'If the account exists, OTP has been issued.',
  data: result
});

const requestPasswordResetOtp = asyncHandler(async (req, res) => {
  const result = await authService.requestPasswordResetOtp(req.body);
  return sendPasswordOtpResponse(res, result);
});

const requestStudentPasswordResetOtp = asyncHandler(async (req, res) => {
  const result = await authService.requestPasswordResetOtp({
    ...req.body,
    role: ROLES.STUDENT
  });

  return sendPasswordOtpResponse(res, result);
});

const requestAdminPasswordResetOtp = asyncHandler(async (req, res) => {
  const result = await authService.requestPasswordResetOtp({
    ...req.body,
    role: ROLES.ADMIN
  });

  return sendPasswordOtpResponse(res, result);
});

const sendPasswordResetResponse = async (res, result) => {
  await logActivity({
    actorId: result.user._id,
    role: result.user.role,
    action: 'password_reset_via_otp',
    entityType: 'User',
    entityId: result.user._id
  });

  return successResponse(res, {
    message: 'Password reset successful',
    data: result
  });
};

const resetPasswordWithOtp = asyncHandler(async (req, res) => {
  const result = await authService.resetPasswordWithOtp(req.body);
  return sendPasswordResetResponse(res, result);
});

const resetStudentPasswordWithOtp = asyncHandler(async (req, res) => {
  const result = await authService.resetPasswordWithOtp({
    ...req.body,
    role: ROLES.STUDENT
  });

  return sendPasswordResetResponse(res, result);
});

const resetAdminPasswordWithOtp = asyncHandler(async (req, res) => {
  const result = await authService.resetPasswordWithOtp({
    ...req.body,
    role: ROLES.ADMIN
  });

  return sendPasswordResetResponse(res, result);
});

module.exports = {
  registerStudent,
  studentLogin,
  adminLogin,
  requestAdminSecurityKey,
  googleAuth,
  googleConfig,
  requestPasswordResetOtp,
  requestStudentPasswordResetOtp,
  requestAdminPasswordResetOtp,
  resetPasswordWithOtp,
  resetStudentPasswordWithOtp,
  resetAdminPasswordWithOtp
};
