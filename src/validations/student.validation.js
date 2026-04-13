const { z, objectId } = require('./common.validation');

const testIdParamSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({ testId: objectId }),
  query: z.object({}).passthrough()
});

const saveAnswerSchema = z.object({
  body: z.object({
    questionId: objectId,
    type: z.enum(['mcq', 'practical', 'viva']),
    selectedOption: z.string().optional(),
    writtenAnswer: z.string().optional(),
    audioUrl: z.string().min(1).optional(),
    transcript: z.string().optional(),
    autoSave: z.boolean().optional().default(false)
  }),
  params: z.object({ submissionId: objectId }),
  query: z.object({}).passthrough()
});

const uploadAudioSchema = z.object({
  body: z.object({
    transcript: z.string().optional().default(''),
    language: z.string().min(2).max(10).optional().default('en')
  }).passthrough(),
  params: z.object({
    submissionId: objectId,
    questionId: objectId
  }),
  query: z.object({}).passthrough()
});

const submissionIdParamSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({ submissionId: objectId }),
  query: z.object({}).passthrough()
});

const resultSummarySchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({ submissionId: objectId }),
  query: z.object({}).passthrough()
});

const historyQuerySchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    status: z.enum(['in_progress', 'submitted', 'pending_review', 'reviewed']).optional()
  }).passthrough()
});

module.exports = {
  testIdParamSchema,
  saveAnswerSchema,
  uploadAudioSchema,
  submissionIdParamSchema,
  resultSummarySchema,
  historyQuerySchema
};
