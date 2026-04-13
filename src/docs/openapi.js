const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Smart Exam System API',
    version: '1.2.0',
    description: 'REST API documentation for Smart Exam System backend.'
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local development server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      AuthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          data: {
            type: 'object',
            properties: {
              token: { type: 'string' },
              user: {
                type: 'object',
                properties: {
                  _id: { type: 'string' },
                  name: { type: 'string' },
                  email: { type: 'string' },
                  role: { type: 'string', enum: ['admin', 'student'] }
                }
              }
            }
          }
        }
      }
    }
  },
  paths: {
    '/api/health': {
      get: {
        tags: ['System'],
        summary: 'Health check'
      }
    },
    '/api/auth/student/register': {
      post: {
        tags: ['Auth'],
        summary: 'Student registration'
      }
    },
    '/api/auth/student/login': {
      post: {
        tags: ['Auth'],
        summary: 'Student login'
      }
    },
    '/api/auth/admin/login': {
      post: {
        tags: ['Auth'],
        summary: 'Admin login'
      }
    },
    '/api/auth/google': {
      post: {
        tags: ['Auth'],
        summary: 'Google sign-in / register',
        description: 'Accepts Google ID token and role intent.'
      }
    },
    '/api/auth/password/request-otp': {
      post: {
        tags: ['Auth'],
        summary: 'Request password reset OTP'
      }
    },
    '/api/auth/password/reset-otp': {
      post: {
        tags: ['Auth'],
        summary: 'Reset password using OTP'
      }
    },
    '/api/student/dashboard': {
      get: {
        tags: ['Student'],
        summary: 'Student dashboard metrics',
        security: [{ bearerAuth: [] }]
      }
    },
    '/api/student/tests': {
      get: {
        tags: ['Student'],
        summary: 'Get available published tests',
        security: [{ bearerAuth: [] }]
      }
    },
    '/api/student/tests/{testId}/start': {
      post: {
        tags: ['Student'],
        summary: 'Start test attempt',
        security: [{ bearerAuth: [] }]
      }
    },
    '/api/student/submissions/{submissionId}/answers/save': {
      post: {
        tags: ['Student'],
        summary: 'Save answer',
        security: [{ bearerAuth: [] }]
      }
    },
    '/api/student/submissions/{submissionId}/submit': {
      post: {
        tags: ['Student'],
        summary: 'Submit final test',
        security: [{ bearerAuth: [] }]
      }
    },
    '/api/admin/dashboard': {
      get: {
        tags: ['Admin'],
        summary: 'Admin dashboard stats',
        security: [{ bearerAuth: [] }]
      }
    },
    '/api/admin/tests': {
      get: {
        tags: ['Admin'],
        summary: 'Get all tests',
        security: [{ bearerAuth: [] }]
      },
      post: {
        tags: ['Admin'],
        summary: 'Create test',
        security: [{ bearerAuth: [] }]
      }
    },
    '/api/admin/tests/{testId}/questions': {
      post: {
        tags: ['Admin'],
        summary: 'Add question to test',
        security: [{ bearerAuth: [] }]
      }
    },
    '/api/admin/tests/{testId}/questions/ai-generate': {
      post: {
        tags: ['Admin'],
        summary: 'Generate AI question draft',
        description: 'Returns a question draft from OpenAI without saving it automatically.',
        security: [{ bearerAuth: [] }]
      }
    },
    '/api/admin/submissions': {
      get: {
        tags: ['Admin'],
        summary: 'Get student submissions with pagination/filtering',
        security: [{ bearerAuth: [] }]
      }
    },
    '/api/admin/submissions/{submissionId}/answers/{answerQuestionId}/ai-review': {
      post: {
        tags: ['Admin'],
        summary: 'Generate AI review suggestion',
        description: 'Generates score + feedback suggestion for practical/viva answers.',
        security: [{ bearerAuth: [] }]
      }
    },
    '/api/admin/results/export': {
      get: {
        tags: ['Admin'],
        summary: 'Export results as CSV/PDF',
        security: [{ bearerAuth: [] }]
      }
    }
  }
};

module.exports = openApiSpec;
