-- CreateTable
CREATE TABLE "ui_settings" (
    "id" TEXT NOT NULL,
    "portal_id" TEXT NOT NULL,
    "employee_id" TEXT,
    "key" VARCHAR(120) NOT NULL,
    "value" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ui_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ui_settings_portal_id_key_idx" ON "ui_settings"("portal_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "ui_settings_portal_id_employee_id_key_key" ON "ui_settings"("portal_id", "employee_id", "key");

-- AddForeignKey
ALTER TABLE "ui_settings" ADD CONSTRAINT "ui_settings_portal_id_fkey" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ui_settings" ADD CONSTRAINT "ui_settings_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- В Postgres NULL не равен NULL, поэтому уникальный индекс выше не удерживает
-- клубную настройку (employee_id IS NULL) от дублей: для неё нужен частичный индекс.
CREATE UNIQUE INDEX "ui_settings_portal_key_shared_key"
    ON "ui_settings"("portal_id", "key")
    WHERE "employee_id" IS NULL;
