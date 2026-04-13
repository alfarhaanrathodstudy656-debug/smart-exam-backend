const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const ROLES = require('../constants/roles');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  password: {
    type: String,
    minlength: 6,
    select: false,
    default: null
  },
  role: {
    type: String,
    enum: Object.values(ROLES),
    default: ROLES.STUDENT,
    index: true
  },
  googleId: {
    type: String,
    index: true,
    sparse: true,
    default: null
  },
  resetOtpHash: {
    type: String,
    select: false,
    default: null
  },
  resetOtpExpiresAt: {
    type: Date,
    select: false,
    default: null
  },
  resetOtpRequestedAt: {
    type: Date,
    select: false,
    default: null
  },
  resetOtpAttempts: {
    type: Number,
    default: 0,
    select: false
  }
}, {
  timestamps: { createdAt: true, updatedAt: true }
});

userSchema.pre('save', async function userPreSave(next) {
  if (!this.isModified('password')) {
    return next();
  }

  if (!this.password) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 12);
  return next();
});

userSchema.methods.comparePassword = function comparePassword(plainPassword) {
  if (!this.password) {
    return false;
  }

  return bcrypt.compare(plainPassword, this.password);
};

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.resetOtpHash;
    delete ret.resetOtpExpiresAt;
    delete ret.resetOtpRequestedAt;
    delete ret.resetOtpAttempts;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);
