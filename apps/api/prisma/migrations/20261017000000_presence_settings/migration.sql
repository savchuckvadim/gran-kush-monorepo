-- CreateTable
CREATE TABLE "presence_settings" (
    "portal_id" TEXT NOT NULL,
    "timezone" VARCHAR(64) NOT NULL,
    "auto_exit_time" VARCHAR(5) NOT NULL,
    "max_session_hours" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "presence_settings_pkey" PRIMARY KEY ("portal_id")
);

-- AddForeignKey
ALTER TABLE "presence_settings" ADD CONSTRAINT "presence_settings_portal_id_fkey" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

