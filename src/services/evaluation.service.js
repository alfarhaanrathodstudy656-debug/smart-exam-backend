const Question = require('../models/Question');

const calculateKeywordCoverage = ({ transcript = '', keywords = [] }) => {
  if (!keywords.length || !transcript) {
    return {
      matchedKeywords: [],
      coverage: 0
    };
  }

  const normalizedTranscript = transcript.toLowerCase();
  const matchedKeywords = keywords.filter((kw) => normalizedTranscript.includes(kw.toLowerCase()));
  const coverage = Number((matchedKeywords.length / keywords.length).toFixed(2));

  return {
    matchedKeywords,
    coverage
  };
};

const evaluateMcqAnswer = ({ selectedOption = '', correctAnswer = '', marks = 0, negativeMarking = 0 }) => {
  if (!selectedOption) {
    return { score: 0, feedback: 'Not attempted', isCorrect: false };
  }

  if (selectedOption.trim().toLowerCase() === correctAnswer.trim().toLowerCase()) {
    return {
      score: marks,
      feedback: 'Auto-graded: correct answer',
      isCorrect: true
    };
  }

  const penalty = Number((marks * negativeMarking).toFixed(2));
  return {
    score: -penalty,
    feedback: penalty > 0
      ? `Auto-graded: incorrect answer. Negative marking applied (${penalty}).`
      : 'Auto-graded: incorrect answer',
    isCorrect: false
  };
};

const autoEvaluateSubmission = ({ submission, questions, negativeMarking }) => {
  const questionMap = new Map(questions.map((question) => [String(question._id), question]));

  let totalScore = 0;
  let pendingManualReview = false;

  submission.answers = submission.answers.map((answer) => {
    const question = questionMap.get(String(answer.questionId));
    if (!question) {
      return answer;
    }

    if (answer.type === 'mcq') {
      const evaluation = evaluateMcqAnswer({
        selectedOption: answer.selectedOption,
        correctAnswer: question.correctAnswer,
        marks: question.marks,
        negativeMarking
      });

      answer.score = evaluation.score;
      answer.feedback = evaluation.feedback;
      answer.isReviewed = true;
      totalScore += evaluation.score;
      return answer;
    }

    const isReviewDone = Boolean(answer.isReviewed);
    if (!isReviewDone) {
      pendingManualReview = true;
    }

    totalScore += Number(answer.score || 0);
    return answer;
  });

  // Keep total score non-negative to avoid confusing UX.
  totalScore = Math.max(0, Number(totalScore.toFixed(2)));

  return {
    totalScore,
    pendingManualReview
  };
};

const buildResultSummary = async ({ submission }) => {
  const questionIds = submission.answers.map((answer) => answer.questionId);
  const questions = await Question.find({ _id: { $in: questionIds } }).lean();
  const map = new Map(questions.map((q) => [String(q._id), q]));

  const breakdownMap = {
    mcq: { obtained: 0, total: 0 },
    practical: { obtained: 0, total: 0 },
    viva: { obtained: 0, total: 0 }
  };

  const mcqStats = {
    totalQuestions: 0,
    attempted: 0,
    correct: 0,
    incorrect: 0,
    unattempted: 0
  };

  const practicalStats = {
    totalQuestions: 0,
    attempted: 0,
    unattempted: 0,
    reviewed: 0,
    pendingReview: 0
  };

  const vivaStats = {
    totalQuestions: 0,
    attempted: 0,
    unattempted: 0,
    reviewed: 0,
    pendingReview: 0
  };

  submission.answers.forEach((answer) => {
    const question = map.get(String(answer.questionId));
    if (!question) {
      return;
    }

    const section = breakdownMap[answer.type] || breakdownMap.practical;
    section.obtained += Number(answer.score || 0);
    section.total += Number(question.marks || 0);

    if (answer.type === 'mcq') {
      mcqStats.totalQuestions += 1;

      const selected = String(answer.selectedOption || '').trim().toLowerCase();
      const correctAnswer = String(question.correctAnswer || '').trim().toLowerCase();

      if (!selected) {
        mcqStats.unattempted += 1;
        return;
      }

      mcqStats.attempted += 1;
      if (selected === correctAnswer) {
        mcqStats.correct += 1;
      } else {
        mcqStats.incorrect += 1;
      }
    }

    if (answer.type === 'practical') {
      practicalStats.totalQuestions += 1;
      const attempted = Boolean(String(answer.writtenAnswer || '').trim());
      if (attempted) {
        practicalStats.attempted += 1;
      } else {
        practicalStats.unattempted += 1;
      }

      if (answer.isReviewed) {
        practicalStats.reviewed += 1;
      } else {
        practicalStats.pendingReview += 1;
      }
    }

    if (answer.type === 'viva') {
      vivaStats.totalQuestions += 1;
      const attempted = Boolean(
        String(answer.transcript || '').trim() || String(answer.audioUrl || '').trim()
      );
      if (attempted) {
        vivaStats.attempted += 1;
      } else {
        vivaStats.unattempted += 1;
      }

      if (answer.isReviewed) {
        vivaStats.reviewed += 1;
      } else {
        vivaStats.pendingReview += 1;
      }
    }
  });

  const totalPossible = Object.values(breakdownMap).reduce((sum, item) => sum + item.total, 0);
  const percentage = totalPossible > 0 ? Number(((submission.totalScore / totalPossible) * 100).toFixed(2)) : 0;

  return {
    submissionId: submission._id,
    status: submission.status,
    totalScore: submission.totalScore,
    totalPossible,
    percentage,
    submittedAt: submission.submittedAt,
    breakdown: {
      mcq: breakdownMap.mcq,
      practical: breakdownMap.practical,
      viva: breakdownMap.viva
    },
    mcqStats,
    practicalStats,
    vivaStats
  };
};

module.exports = {
  calculateKeywordCoverage,
  evaluateMcqAnswer,
  autoEvaluateSubmission,
  buildResultSummary
};
