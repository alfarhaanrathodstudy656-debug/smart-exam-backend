# Smart Exam Backend

Production-style Express + MongoDB backend for Smart Exam System.

## Stack

- Node.js + Express.js
- MongoDB + Mongoose
- JWT authentication
- bcrypt password hashing
- Google Sign-In token verification (`google-auth-library`)
- OTP reset email flow (`nodemailer`)
- OpenAI-assisted question drafting and manual review suggestions
- Zod request validation
- Multer for viva audio uploads

## Architecture

- `src/config` -> environment and DB setup
- `src/models` -> MongoDB models
- `src/controllers` -> route handlers
- `src/services` -> business logic (evaluation, exports, analytics, OpenAI)
- `src/routes` -> REST route modules
- `src/middleware` -> auth, role, validation, upload, error handlers
- `src/utils` -> shared utilities and response helpers
- `src/validations` -> zod schemas

## Setup

1. Copy `.env.example` to `.env`.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start in dev mode:
   ```bash
   npm run dev
   ```

Default admin credentials are seeded from `.env`:
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

## Deploy On Render

This repository includes a Render blueprint file:
- `render.yaml`

Steps:
1. Open Render Dashboard -> New -> Blueprint.
2. Connect GitHub repo: `alfarhaanrathodstudy656-debug/smart-exam-backend`.
3. Render will detect `render.yaml`.
4. Set required secret env vars in Render before first deploy:
   - `MONGO_URI`
   - `JWT_SECRET`
   - `ADMIN_PASSWORD`
   - `CLIENT_URL`
   - `GOOGLE_CLIENT_ID` (if Google Sign-In is enabled)
   - `OPENAI_API_KEY` (if AI features are enabled)
5. Deploy and verify:
   - `GET /api/health`

## Environment Variables

### Core

- `MONGO_URI`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CLIENT_URL`

### Auth Integrations

- `GOOGLE_CLIENT_ID`
- `GOOGLE_ADMIN_ALLOWLIST`
- `PASSWORD_RESET_OTP_EXPIRY_MINUTES`
- SMTP settings (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`)

### OpenAI

- `OPENAI_API_KEY`
- `OPENAI_MODEL` (default: `gpt-4.1-mini`)
- `OPENAI_BASE_URL` (default: `https://api.openai.com/v1`)

## Auth APIs

- `POST /api/auth/student/register`
- `POST /api/auth/student/login`
- `POST /api/auth/admin/login`
- `POST /api/auth/google`
- `POST /api/auth/password/request-otp`
- `POST /api/auth/password/reset-otp`

## Student APIs

- `GET /api/student/dashboard`
- `GET /api/student/tests`
- `GET /api/student/tests/:testId`
- `POST /api/student/tests/:testId/start`
- `GET /api/student/tests/:testId/questions`
- `GET /api/student/tests/:testId/leaderboard`
- `POST /api/student/submissions/:submissionId/answers/save`
- `POST /api/student/submissions/:submissionId/answers/autosave`
- `POST /api/student/submissions/:submissionId/answers/:questionId/audio`
- `POST /api/student/submissions/:submissionId/submit`
- `GET /api/student/submissions/:submissionId/result`
- `GET /api/student/submissions/history`

## Admin APIs

- `GET /api/admin/dashboard`
- `POST /api/admin/tests`
- `GET /api/admin/tests`
- `GET /api/admin/tests/:testId`
- `PATCH /api/admin/tests/:testId`
- `DELETE /api/admin/tests/:testId`
- `PATCH /api/admin/tests/:testId/publish`
- `POST /api/admin/tests/:testId/questions`
- `POST /api/admin/tests/:testId/questions/ai-generate`
- `PATCH /api/admin/tests/:testId/questions/:questionId`
- `DELETE /api/admin/tests/:testId/questions/:questionId`
- `GET /api/admin/submissions`
- `PATCH /api/admin/submissions/:submissionId/answers/:answerQuestionId/review`
- `PATCH /api/admin/submissions/:submissionId/practical/:answerQuestionId/review`
- `PATCH /api/admin/submissions/:submissionId/viva/:answerQuestionId/review`
- `POST /api/admin/submissions/:submissionId/answers/:answerQuestionId/ai-review`
- `GET /api/admin/analytics/tests/:testId`
- `GET /api/admin/leaderboard/:testId`
- `GET /api/admin/results/export?format=csv|pdf&testId=<optional>`
- `GET /api/admin/activity-logs`

## AI Features

- AI draft generation suggests MCQ, Practical, or Viva question content for admins.
- AI review suggestion gives a recommended score and feedback for practical/viva answers.
- AI suggestions never auto-persist scores; admin review submission endpoint still controls final grading.

## Evaluation Rules

- MCQ is auto-evaluated on final submission.
- Wrong MCQ answers apply negative marks based on `test.negativeMarking` ratio.
- Practical and viva stay pending review until an admin reviews them.
- Viva accepts uploaded file (`audio`) or `audioUrl` metadata + transcript.

## Notes

- `uploads/viva` stores audio files.
- Responses follow unified format:
  - `{ success, message, data, meta? }`
- Request validation errors and server errors are centralized.

## Swagger Docs

- Swagger UI: `http://localhost:5000/api/docs`
- OpenAPI JSON: `http://localhost:5000/api/openapi.json`
