const nodemailer = require('nodemailer');
const env = require('../config/env');

const canSendEmail = Boolean(env.smtp.host && env.smtp.user && env.smtp.pass);

const transporter = canSendEmail
  ? nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: {
        user: env.smtp.user,
        pass: env.smtp.pass
      }
    })
  : null;

const sendPasswordResetOtpEmail = async ({ to, name, otp, expiryMinutes }) => {
  if (!transporter) {
    return { sent: false };
  }

  await transporter.sendMail({
    from: env.smtp.from,
    to,
    subject: 'Smart Exam Password Reset OTP',
    text: `Hi ${name || 'User'}, your OTP is ${otp}. It expires in ${expiryMinutes} minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Smart Exam Password Reset</h2>
        <p>Hi ${name || 'User'},</p>
        <p>Your one-time password is:</p>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${otp}</p>
        <p>This OTP expires in <strong>${expiryMinutes} minutes</strong>.</p>
        <p>If you did not request this, please ignore this email.</p>
      </div>
    `
  });

  return { sent: true };
};

module.exports = {
  canSendEmail,
  sendPasswordResetOtpEmail
};
