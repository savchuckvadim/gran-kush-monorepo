-- Admin panel sign-ins become auth sessions: revocable on logout and on password change
ALTER TYPE "SessionAudience" ADD VALUE 'platform';
