-- AlterTable
ALTER TABLE "global_stage_templates" ADD COLUMN     "name_i18n" JSONB;

-- AlterTable
ALTER TABLE "stages" ADD COLUMN     "name_i18n" JSONB;
