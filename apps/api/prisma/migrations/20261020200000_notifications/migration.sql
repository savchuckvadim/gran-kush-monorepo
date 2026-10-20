-- CreateEnum
CREATE TYPE "notification_recipient" AS ENUM ('employee', 'member');

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "portal_id" TEXT NOT NULL,
    "recipient_kind" "notification_recipient" NOT NULL,
    "employee_id" TEXT,
    "member_id" TEXT,
    "recipient_key" VARCHAR(80) NOT NULL,
    "type" VARCHAR(64) NOT NULL,
    "event_id" TEXT NOT NULL,
    "subject_kind" VARCHAR(32) NOT NULL,
    "subject_id" TEXT NOT NULL,
    "params" JSONB NOT NULL DEFAULT '{}',
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "user_id" TEXT NOT NULL,
    "channel" VARCHAR(32) NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("user_id","channel")
);

-- CreateIndex
CREATE INDEX "notifications_portal_id_recipient_key_created_at_idx" ON "notifications"("portal_id", "recipient_key", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_event_id_recipient_key_key" ON "notifications"("event_id", "recipient_key");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_portal_id_fkey" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
