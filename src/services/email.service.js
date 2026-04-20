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

const sendAdminSecurityKeyEmail = async ({ to, name, key, expiryMinutes }) => {
  if (!transporter) {
    return { sent: false };
  }

  await transporter.sendMail({
    from: env.smtp.from,
    to,
    subject: 'Smart Exam Admin Security Key',
    text: `Hi ${name || 'Admin'}, your admin security key is ${key}. It expires in ${expiryMinutes} minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Smart Exam Admin Login</h2>
        <p>Hi ${name || 'Admin'},</p>
        <p>Your admin security key is:</p>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${key}</p>
        <p>This key expires in <strong>${expiryMinutes} minutes</strong> and can be used once.</p>
        <p>If you did not request this, secure your account immediately.</p>
      </div>
    `
  });

  return { sent: true };
};

module.exports = {
  canSendEmail,
  sendPasswordResetOtpEmail,
  sendAdminSecurityKeyEmail
};
