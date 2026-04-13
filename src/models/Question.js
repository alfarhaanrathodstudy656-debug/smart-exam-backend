const mongoose = require('mongoose');

const QUESTION_TYPES = ['mcq', 'practical', 'viva'];

const questionSchema = new mongoose.Schema({
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Test',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: QUESTION_TYPES,
    required: true,
    index: true
  },
  questionText: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000
  },
  options: [{
    type: String,
    trim: true
  }],
  correctAnswer: {
    type: String,
    trim: true
  },
  expectedAnswer: {
    type: String,
    default: ''
  },
  keywords: [{
    type: String,
    trim: true
  }],
  speakingTime: {
    type: Number,
    min: 10,
    default: 60
  },
  marks: {
    type: Number,
    required: true,
    min: 0
  }
}, {
  timestamps: { createdAt: true, updatedAt: true }
});

questionSchema.pre('validate', function questionPreValidate(next) {
  if (this.type === 'mcq') {
    if (!Array.isArray(this.options) || this.options.length < 2) {
      return next(new Error('MCQ requires at least 2 options'));
    }
    if (!this.correctAnswer) {
      return next(new Error('MCQ requires correctAnswer'));
    }
  }

  if (this.type === 'practical') {
    this.options = [];
    this.correctAnswer = undefined;
    this.keywords = [];
    this.speakingTime = undefined;
  }

  if (this.type === 'viva') {
    this.options = [];
    this.correctAnswer = undefined;
    this.expectedAnswer = '';
    if (!this.speakingTime) {
      this.speakingTime = 60;
    }
  }

  return next();
});

questionSchema.index({ testId: 1, type: 1 });

module.exports = mongoose.model('Question', questionSchema);
