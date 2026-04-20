const { OAuth2Client } = require('google-auth-library');
const { StatusCodes } = require('http-status-codes');
const User = require('../models/User');
const AppError = require('../utils/appError');
const { generateToken } = require('../utils/jwt');
const ROLES = require('../constants/roles');
const env = require('../config/env');
const { generateNumericOtp, hashOtp } = require('../utils/otp');
const { sendPasswordResetOtpEmail, canSendEmail } = require('./email.service');

const oauthClient = env.googleClientId ? new OAuth2Client(env.googleClientId) : null;
const ACCOUNT_LOCK_STATUS = 423;

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt
});

const getLockConfigByRole = (role) => {
  if (role === ROLES.ADMIN) {
    return {
      threshold: Math.max(3, Number(env.adminLoginLockThreshold || 5)),
      durationMinutes: Math.max(5, Number(env.adminLoginLockDurationMinutes || 30))
    };
  }

  return {
    threshold: Math.max(3, Number(env.loginLockThreshold || 8)),
    durationMinutes: Math.max(5, Number(env.loginLockDurationMinutes || 15))
  };
};

const normalizeSecret = (value) => (value || '').trim();

const assertAdminPortalAccessKey = (adminAccessKey) => {
  const configuredKey = normalizeSecret(env.adminPortalAccessKey);
  if (!configuredKey) {
    return;
  }

  if (normalizeSecret(adminAccessKey) === configuredKey) {
    return;
  }

  throw new AppError('Admin security key is required and must be valid.', StatusCodes.FORBIDDEN);
};

const ensureAccountNotLocked = (user) => {
  if (!user.lockUntil) {
    return;
  }

  const lockUntilDate = new Date(user.lockUntil);
  if (Number.isNaN(lockUntilDate.getTime()) || lockUntilDate.getTime() <= Date.now()) {
    return;
  }

  const minutes = Math.max(1, Math.ceil((lockUntilDate.getTime() - Date.now()) / (60 * 1000)));
  throw new AppError(
    `Account temporarily locked due to repeated failed logins. Try again in ${minutes} minute(s).`,
    ACCOUNT_LOCK_STATUS
  );
};

const registerFailedLoginAttempt = async (user, role) => {
  const { threshold, durationMinutes } = getLockConfigByRole(role);
  const nextAttempts = Number(user.failedLoginAttempts || 0) + 1;

  user.failedLoginAttempts = nextAttempts;
  if (nextAttempts >= threshold) {
    user.lockUntil = new Date(Date.now() + durationMinutes * 60 * 1000);
    user.failedLoginAttempts = 0;
  }

  await user.save();
};

const clearLoginProtectionState = async (user) => {
  if (!user.failedLoginAttempts && !user.lockUntil) {
    return;
  }

  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  await user.save();
};

const assertPrimaryAdminEmail = (email) => {
  if (email.toLowerCase() === env.adminEmail.toLowerCase()) {
    return;
  }

  throw new AppError('Admin portal access is restricted to the primary admin account.', StatusCodes.FORBIDDEN);
};
const registerStudent = async ({ name, email, password }) => {
  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) {
    throw new AppError('Email is already registered', StatusCodes.CONFLICT);
  }

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    role: ROLES.STUDENT
  });

  const token = generateToken({ userId: user._id, role: user.role });
  return { user: sanitizeUser(user), token };
};

const loginByRole = async ({ email, password, role, adminAccessKey }) => {
  const normalizedEmail = email.toLowerCase();
  if (role === ROLES.ADMIN) {
    assertPrimaryAdminEmail(normalizedEmail);
    assertAdminPortalAccessKey(adminAccessKey);
  }

  const user = await User.findOne({ email: normalizedEmail, role }).select('+password +failedLoginAttempts +lockUntil');

  if (!user) {
    throw new AppError('Invalid credentials', StatusCodes.UNAUTHORIZED);
  }

  ensureAccountNotLocked(user);

  if (!user.password) {
    throw new AppError('Password not set for this account. Use OTP reset first.', StatusCodes.BAD_REQUEST);
  }

  const isValid = await user.comparePassword(password);
  if (!isValid) {
    await registerFailedLoginAttempt(user, role);
    throw new AppError('Invalid credentials', StatusCodes.UNAUTHORIZED);
  }

  await clearLoginProtectionState(user);

  const token = generateToken({ userId: user._id, role: user.role });
  return { user: sanitizeUser(user), token };
};

const verifyGoogleToken = async (idToken) => {
  if (!oauthClient) {
    throw new AppError('Google OAuth is not configured on server', StatusCodes.SERVICE_UNAVAILABLE);
  }

  const ticket = await oauthClient.verifyIdToken({
    idToken,
    audience: env.googleClientId
  });

  const payload = ticket.getPayload();
  if (!payload?.email || !payload?.sub) {
    throw new AppError('Invalid Google token payload', StatusCodes.UNAUTHORIZED);
  }

  if (!payload.email_verified) {
    throw new AppError('Google account email is not verified', StatusCodes.UNAUTHORIZED);
  }

  return {
    email: payload.email.toLowerCase(),
    name: payload.name || payload.email,
    googleId: payload.sub
  };
};

const assertAdminGoogleAllowed = (email) => {
  assertPrimaryAdminEmail(email);

  const allowlist = env.googleAdminAllowlist;
  if (allowlist.includes(email.toLowerCase())) {
    return;
  }

  throw new AppError('Google admin login is not allowed for this email', StatusCodes.FORBIDDEN);
};

const handleGoogleAuth = async ({ idToken, role = ROLES.STUDENT, intent = 'login', adminAccessKey }) => {
  const profile = await verifyGoogleToken(idToken);

  let user = await User.findOne({ email: profile.email }).select('+password +failedLoginAttempts +lockUntil');

  if (role === ROLES.ADMIN) {
    assertAdminGoogleAllowed(profile.email);
    assertAdminPortalAccessKey(adminAccessKey);
  }

  if (!user) {
    if (intent === 'login') {
      throw new AppError('No account exists for this Google user. Register first.', StatusCodes.NOT_FOUND);
    }

    user = await User.create({
      name: profile.name,
      email: profile.email,
      role,
      googleId: profile.googleId,
      password: null
    });
  } else {
    if (user.role !== role) {
      throw new AppError(`This account is registered as ${user.role}, not ${role}.`, StatusCodes.FORBIDDEN);
    }

    ensureAccountNotLocked(user);

    if (!user.googleId) {
      user.googleId = profile.googleId;
    }

    if (user.failedLoginAttempts || user.lockUntil) {
      user.failedLoginAttempts = 0;
      user.lockUntil = null;
    }

    await user.save();
  }

  const token = generateToken({ userId: user._id, role: user.role });
  return { user: sanitizeUser(user), token };
};

const requestPasswordResetOtp = async ({ email, role, adminAccessKey }) => {
  const normalizedEmail = email.toLowerCase();

  if (role === ROLES.ADMIN) {
    assertAdminPortalAccessKey(adminAccessKey);
  }

  const query = role ? { email: normalizedEmail, role } : { email: normalizedEmail };
  const user = await User.findOne(query).select('+resetOtpHash +resetOtpExpiresAt +resetOtpRequestedAt +resetOtpAttempts');

  if (!user) {
    return {
      accepted: true,
      email: normalizedEmail,
      expiresInMinutes: env.passwordResetOtpExpiryMinutes
    };
  }

  const otp = generateNumericOtp(6);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + (env.passwordResetOtpExpiryMinutes * 60 * 1000));

  user.resetOtpHash = hashOtp(otp);
  user.resetOtpExpiresAt = expiresAt;
  user.resetOtpRequestedAt = now;
  user.resetOtpAttempts = 0;
  await user.save();

  const emailResult = await sendPasswordResetOtpEmail({
    to: user.email,
    name: user.name,
    otp,
    expiryMinutes: env.passwordResetOtpExpiryMinutes
  });

  return {
    accepted: true,
    email: user.email,
    expiresInMinutes: env.passwordResetOtpExpiryMinutes,
    emailSent: emailResult.sent,
    fallbackDelivery: !emailResult.sent,
    ...(env.nodeEnv !== 'production' && !canSendEmail ? { devOtp: otp } : {})
  };
};

const resetPasswordWithOtp = async ({ email, otp, newPassword, role, adminAccessKey }) => {
  const normalizedEmail = email.toLowerCase();

  if (role === ROLES.ADMIN) {
    assertAdminPortalAccessKey(adminAccessKey);
  }

  const query = role ? { email: normalizedEmail, role } : { email: normalizedEmail };

  const user = await User.findOne(query).select('+password +resetOtpHash +resetOtpExpiresAt +resetOtpAttempts');
  if (!user) {
    throw new AppError('Account not found', StatusCodes.NOT_FOUND);
  }

  if (!user.resetOtpHash || !user.resetOtpExpiresAt) {
    throw new AppError('No valid OTP request found. Request a new OTP.', StatusCodes.BAD_REQUEST);
  }

  if (user.resetOtpExpiresAt.getTime() < Date.now()) {
    throw new AppError('OTP has expired. Request a new OTP.', StatusCodes.BAD_REQUEST);
  }

  if (user.resetOtpAttempts >= 5) {
    throw new AppError('Too many invalid OTP attempts. Request a fresh OTP.', StatusCodes.TOO_MANY_REQUESTS);
  }

  const otpHash = hashOtp(otp);
  if (otpHash !== user.resetOtpHash) {
    user.resetOtpAttempts += 1;
    await user.save();
    throw new AppError('Invalid OTP', StatusCodes.UNAUTHORIZED);
  }

  user.password = newPassword;
  user.resetOtpHash = null;
  user.resetOtpExpiresAt = null;
  user.resetOtpRequestedAt = null;
  user.resetOtpAttempts = 0;
  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  await user.save();

  const token = generateToken({ userId: user._id, role: user.role });
  return {
    user: sanitizeUser(user),
    token
  };
};

const getGooglePublicConfig = () => ({
  configured: Boolean(env.googleClientId),
  clientId: env.googleClientId || ''
});
const ensureDefaultAdmin = async () => {
  const exists = await User.findOne({ role: ROLES.ADMIN, email: env.adminEmail.toLowerCase() });
  if (exists) {
    return;
  }

  await User.create({
    name: 'System Admin',
    email: env.adminEmail.toLowerCase(),
    password: env.adminPassword,
    role: ROLES.ADMIN
  });
};

module.exports = {
  registerStudent,
  loginByRole,
  handleGoogleAuth,
  requestPasswordResetOtp,
  resetPasswordWithOtp,
  getGooglePublicConfig,
  ensureDefaultAdmin
};


