const { z } = require('./common.validation');
const ROLES = require('../constants/roles');

const registerStudentSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(120),
    email: z.string().email(),
    password: z.string().min(6).max(128)
  }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough()
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6).max(128)
  }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough()
});

const googleAuthSchema = z.object({
  body: z.object({
    idToken: z.string().min(20),
    role: z.enum([ROLES.ADMIN, ROLES.STUDENT]).optional().default(ROLES.STUDENT),
    intent: z.enum(['login', 'register']).optional().default('login')
  }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough()
});

const requestPasswordResetOtpSchema = z.object({
  body: z.object({
    email: z.string().email(),
    role: z.enum([ROLES.ADMIN, ROLES.STUDENT]).optional()
  }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough()
});

const resetPasswordWithOtpSchema = z.object({
  body: z.object({
    email: z.string().email(),
    role: z.enum([ROLES.ADMIN, ROLES.STUDENT]).optional(),
    otp: z.string().regex(/^\d{6}$/, 'OTP must be a 6-digit code'),
    newPassword: z.string().min(8).max(128)
  }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough()
});

module.exports = {
  registerStudentSchema,
  loginSchema,
  googleAuthSchema,
  requestPasswordResetOtpSchema,
  resetPasswordWithOtpSchema
};
