const mongoose = require('mongoose');
const SUBMISSION_STATUS = require('../constants/submissionStatus');

const answerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  type: {
    type: String,
    enum: ['mcq', 'practical', 'viva'],
    required: true
  },
  selectedOption: {
    type: String,
    default: ''
  },
  writtenAnswer: {
    type: String,
    default: ''
  },
  audioUrl: {
    type: String,
    default: ''
  },
  transcript: {
    type: String,
    default: ''
  },
  score: {
    type: Number,
    default: 0
  },
  feedback: {
    type: String,
    default: ''
  },
  isReviewed: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const submissionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Test',
    required: true,
    index: true
  },
  submittedAt: {
    type: Date
  },
  status: {
    type: String,
    enum: Object.values(SUBMISSION_STATUS),
    default: SUBMISSION_STATUS.IN_PROGRESS,
    index: true
  },
  attemptNumber: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  totalScore: {
    type: Number,
    default: 0
  },
  answers: {
    type: [answerSchema],
    default: []
  }
}, {
  timestamps: { createdAt: true, updatedAt: true }
});

submissionSchema.index({ userId: 1, testId: 1, attemptNumber: 1 });
submissionSchema.index({ testId: 1, status: 1 });

module.exports = mongoose.model('Submission', submissionSchema);

