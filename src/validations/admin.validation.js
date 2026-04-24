const { z, objectId } = require('./common.validation');

const questionBodySchema = z.object({
  type: z.enum(['mcq', 'practical', 'viva']),
  questionText: z.string().min(3).max(5000),
  options: z.array(z.string().min(1)).optional(),
  correctAnswer: z.string().optional(),
  expectedAnswer: z.string().optional(),
  keywords: z.array(z.string().min(1)).optional(),
  speakingTime: z.number().int().min(10).optional(),
  marks: z.number().nonnegative()
}).superRefine((value, ctx) => {
  if (value.type === 'mcq') {
    if (!value.options || value.options.length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'MCQ requires at least 2 options', path: ['options'] });
    }
    if (!value.correctAnswer) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'MCQ requires correctAnswer', path: ['correctAnswer'] });
    }
  }

  if (value.type === 'viva') {
    if (!value.keywords || value.keywords.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Viva requires keywords', path: ['keywords'] });
    }
    if (!value.speakingTime) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Viva requires speakingTime', path: ['speakingTime'] });
    }
  }
});

const createTestSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(180),
    subject: z.string().min(2).max(120),
    description: z.string().max(2000).optional().default(''),
    duration: z.number().int().positive(),
    totalMarks: z.number().positive(),
    negativeMarking: z.number().min(0).max(1).optional(),
    maxAttemptsPerStudent: z.number().int().min(1).max(20).optional(),
    isPublished: z.boolean().optional()
  }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough()
});

const updateTestSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(180).optional(),
    subject: z.string().min(2).max(120).optional(),
    description: z.string().max(2000).optional(),
    duration: z.number().int().positive().optional(),
    totalMarks: z.number().positive().optional(),
    negativeMarking: z.number().min(0).max(1).optional(),
    maxAttemptsPerStudent: z.number().int().min(1).max(20).optional(),
    isPublished: z.boolean().optional()
  }).refine((obj) => Object.keys(obj).length > 0, 'At least one field is required'),
  params: z.object({ testId: objectId }),
  query: z.object({}).passthrough()
});

const testIdParamSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({ testId: objectId }),
  query: z.object({}).passthrough()
});

const publishTestSchema = z.object({
  body: z.object({
    isPublished: z.boolean()
  }),
  params: z.object({ testId: objectId }),
  query: z.object({}).passthrough()
});

const questionSchema = z.object({
  body: questionBodySchema,
  params: z.object({ testId: objectId }),
  query: z.object({}).passthrough()
});

const updateQuestionSchema = z.object({
  body: z.object({
    type: z.enum(['mcq', 'practical', 'viva']).optional(),
    questionText: z.string().min(3).max(5000).optional(),
    options: z.array(z.string().min(1)).optional(),
    correctAnswer: z.string().optional(),
    expectedAnswer: z.string().optional(),
    keywords: z.array(z.string().min(1)).optional(),
    speakingTime: z.number().int().min(10).optional(),
    marks: z.number().nonnegative().optional()
  }).refine((obj) => Object.keys(obj).length > 0, 'At least one field is required'),
  params: z.object({
    testId: objectId,
    questionId: objectId
  }),
  query: z.object({}).passthrough()
});

const questionParamSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({
    testId: objectId,
    questionId: objectId
  }),
  query: z.object({}).passthrough()
});

const reviewAnswerSchema = z.object({
  body: z.object({
    score: z.number().nonnegative(),
    feedback: z.string().max(2000).optional().default(''),
    isReviewed: z.boolean().optional().default(true)
  }),
  params: z.object({
    submissionId: objectId,
    answerQuestionId: objectId
  }),
  query: z.object({}).passthrough()
});

const aiGenerateQuestionSchema = z.object({
  body: z.object({
    type: z.enum(['mcq', 'practical', 'viva']),
    topic: z.string().min(2).max(200).optional(),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional().default('medium'),
    marks: z.number().positive().optional(),
    additionalInstructions: z.string().max(2000).optional().default('')
  }),
  params: z.object({ testId: objectId }),
  query: z.object({}).passthrough()
});

const aiReviewAnswerSchema = z.object({
  body: z.object({
    scoringStyle: z.enum(['strict', 'balanced', 'lenient']).optional().default('balanced'),
    rubric: z.string().max(2000).optional().default('')
  }),
  params: z.object({
    submissionId: objectId,
    answerQuestionId: objectId
  }),
  query: z.object({}).passthrough()
});

const submissionsQuerySchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    testId: objectId.optional(),
    studentId: objectId.optional(),
    status: z.enum(['in_progress', 'submitted', 'pending_review', 'reviewed']).optional()
  }).passthrough()
});

const studentsQuerySchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().max(120).optional()
  }).passthrough()
});

const studentIdParamSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({
    studentId: objectId
  }),
  query: z.object({}).passthrough()
});

const exportResultsSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
  query: z.object({
    format: z.enum(['csv', 'pdf']).optional().default('csv'),
    testId: objectId.optional()
  }).passthrough()
});

module.exports = {
  createTestSchema,
  updateTestSchema,
  testIdParamSchema,
  publishTestSchema,
  questionSchema,
  updateQuestionSchema,
  questionParamSchema,
  reviewAnswerSchema,
  aiGenerateQuestionSchema,
  aiReviewAnswerSchema,
  submissionsQuerySchema,
  studentsQuerySchema,
  studentIdParamSchema,
  exportResultsSchema
};
