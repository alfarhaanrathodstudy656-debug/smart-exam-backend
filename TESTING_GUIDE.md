# Smart Exam E2E Validation Guide

This checklist validates the requested flows against the implemented APIs.

## 1) Student email/password registration and login

1. `POST /api/auth/student/register`
2. `POST /api/auth/student/login`
3. Confirm JWT token and role=`student`.

## 2) Admin forgot/reset password via OTP

1. `POST /api/auth/password/request-otp` with role=`admin` and admin email.
2. Retrieve OTP from email (or `devOtp` in non-production with SMTP disabled).
3. `POST /api/auth/password/reset-otp` with email+role+otp+newPassword.
4. Confirm login works via `POST /api/auth/admin/login`.

## 3) Google sign-in

1. Frontend uses Google Identity Services and sends `idToken` to `POST /api/auth/google`.
2. For admin role, ensure email is allowlisted in `GOOGLE_ADMIN_ALLOWLIST`.
3. Verify redirect to role home after token response.

## 4) Full exam flow (tamper resistant)

1. Student: `POST /api/student/tests/:testId/start`
2. Student: `POST /api/student/submissions/:submissionId/answers/save`
3. Student: `POST /api/student/submissions/:submissionId/submit`
4. Confirm score fields cannot be set by student payload (server ignores score fields and enforces question type).
5. `GET /api/student/submissions/:submissionId/result`

## 5) Admin test lifecycle + student visibility

1. Admin: `POST /api/admin/tests`
2. Admin: `POST /api/admin/tests/:testId/questions`
3. Admin: `PATCH /api/admin/tests/:testId/publish` with `isPublished=true`
4. Student: `GET /api/student/tests` and confirm published test appears.

## 6) Security findings remediation

1. Apply `security/supabase_security_hardening.sql` in Supabase SQL editor.
2. Enable leaked password protection in Supabase Auth settings.
3. Re-run your security scanner and verify findings are cleared.
