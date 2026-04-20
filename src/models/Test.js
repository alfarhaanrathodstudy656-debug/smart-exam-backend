const mongoose = require('mongoose');
const env = require('../config/env');

const testSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 180
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  description: {
    type: String,
    default: '',
    maxlength: 2000
  },
  duration: {
    type: Number,
    required: true,
    min: 1
  },
  totalMarks: {
    type: Number,
    required: true,
    min: 1
  },
  negativeMarking: {
    type: Number,
    default: env.defaultNegativeMarkRatio,
    min: 0,
    max: 1
  },
  maxAttemptsPerStudent: {
    type: Number,
    default: 1,
    min: 1,
    max: 20
  },
  isPublished: {
    type: Boolean,
    default: false,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  }
}, {
  timestamps: { createdAt: true, updatedAt: true }
});

testSchema.index({ subject: 1, isPublished: 1 });

module.exports = mongoose.model('Test', testSchema);
