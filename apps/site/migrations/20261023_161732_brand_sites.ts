import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

// Sites = installations (packages/brand, TASK-793): inkspace and plisplas join, Nagual leaves —
// it stays a CRM skin only (TASK-761), its rows (if any) go with it. The page's site now defaults
// in the app to the build's own; the default is dropped first, it holds the old type.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "pages" ALTER COLUMN "site" DROP DEFAULT;
  DELETE FROM "pages" WHERE "site" = 'nagual';
  DELETE FROM "sites" WHERE "code" = 'nagual';
  ALTER TABLE "pages" ALTER COLUMN "site" SET DATA TYPE text;
  DROP TYPE "public"."enum_pages_site";
  CREATE TYPE "public"."enum_pages_site" AS ENUM('pafpaf', 'inkspace', 'plisplas');
  ALTER TABLE "pages" ALTER COLUMN "site" SET DATA TYPE "public"."enum_pages_site" USING "site"::"public"."enum_pages_site";
  ALTER TABLE "sites" ALTER COLUMN "code" SET DATA TYPE text;
  DROP TYPE "public"."enum_sites_code";
  CREATE TYPE "public"."enum_sites_code" AS ENUM('pafpaf', 'inkspace', 'plisplas');
  ALTER TABLE "sites" ALTER COLUMN "code" SET DATA TYPE "public"."enum_sites_code" USING "code"::"public"."enum_sites_code";`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DELETE FROM "pages" WHERE "site" IN ('inkspace', 'plisplas');
  DELETE FROM "sites" WHERE "code" IN ('inkspace', 'plisplas');
  ALTER TABLE "pages" ALTER COLUMN "site" SET DATA TYPE text;
  DROP TYPE "public"."enum_pages_site";
  CREATE TYPE "public"."enum_pages_site" AS ENUM('pafpaf', 'nagual');
  ALTER TABLE "pages" ALTER COLUMN "site" SET DATA TYPE "public"."enum_pages_site" USING "site"::"public"."enum_pages_site";
  ALTER TABLE "pages" ALTER COLUMN "site" SET DEFAULT 'pafpaf'::"public"."enum_pages_site";
  ALTER TABLE "sites" ALTER COLUMN "code" SET DATA TYPE text;
  DROP TYPE "public"."enum_sites_code";
  CREATE TYPE "public"."enum_sites_code" AS ENUM('pafpaf', 'nagual');
  ALTER TABLE "sites" ALTER COLUMN "code" SET DATA TYPE "public"."enum_sites_code" USING "code"::"public"."enum_sites_code";`)
}
