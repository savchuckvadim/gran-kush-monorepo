-- TASK-668: одноразовые токены из писем хранятся как SHA-256 (`hashSecretToken` в API).
-- Уже выданные токены хешируются здесь же, поэтому ссылки из отправленных писем и висящие
-- приглашения продолжают работать. Хеш — hex от SHA-256 UTF-8 строки, как в Node.

UPDATE "users"
SET "email_verification_token" = encode(sha256(convert_to("email_verification_token", 'UTF8')), 'hex')
WHERE "email_verification_token" IS NOT NULL;

UPDATE "users"
SET "reset_password_token" = encode(sha256(convert_to("reset_password_token", 'UTF8')), 'hex')
WHERE "reset_password_token" IS NOT NULL;

UPDATE "members"
SET "consent_token" = encode(sha256(convert_to("consent_token", 'UTF8')), 'hex')
WHERE "consent_token" IS NOT NULL;

UPDATE "employee_invitations"
SET "token" = encode(sha256(convert_to("token", 'UTF8')), 'hex');
