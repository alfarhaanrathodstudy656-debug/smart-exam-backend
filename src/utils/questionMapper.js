const sanitizeStudentQuestion = (question) => ({
  _id: question._id,
  testId: question.testId,
  type: question.type,
  questionText: question.questionText,
  options: question.type === 'mcq' ? question.options : undefined,
  marks: question.marks,
  speakingTime: question.type === 'viva' ? question.speakingTime : undefined,
  createdAt: question.createdAt
});

module.exports = {
  sanitizeStudentQuestion
};
