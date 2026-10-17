-- TASK-730: роли клуба с правами вместо enum EmployeeRole.
-- Каждому клубу — четыре системные роли; сотрудники и приглашения получают роль по прежнему enum
-- (portal_owner → owner). Наборы прав менеджера и сотрудника — DEFAULT_ROLE_PERMISSIONS на момент
-- миграции (access/domain/portal-role.ts); у owner и admin права не хранятся, они вычисляются.

CREATE TABLE "portal_roles" (
    "id" TEXT NOT NULL,
    "portal_id" TEXT NOT NULL,
    "key" VARCHAR(64) NOT NULL,
    "name" VARCHAR(120),
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portal_roles_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "portal_roles_portal_id_idx" ON "portal_roles"("portal_id");
CREATE UNIQUE INDEX "portal_roles_portal_id_key_key" ON "portal_roles"("portal_id", "key");
ALTER TABLE "portal_roles" ADD CONSTRAINT "portal_roles_portal_id_fkey" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "portal_roles" ("id", "portal_id", "key", "is_system", "permissions", "updated_at")
SELECT gen_random_uuid()::text, p."id", r."key", true, r."permissions", CURRENT_TIMESTAMP
FROM "portals" p
CROSS JOIN (
    VALUES
        ('owner', ARRAY[]::TEXT[]),
        ('admin', ARRAY[]::TEXT[]),
        ('manager', ARRAY[
            'members.read', 'members.create', 'members.edit', 'members.documents',
            'orders.read', 'orders.create', 'orders.process',
            'finance.read',
            'presence.read', 'presence.checkin', 'qr.manage',
            'records.read', 'records.write',
            'employees.read',
            'settings.views'
        ]::TEXT[]),
        ('employee', ARRAY[
            'members.read', 'members.create',
            'orders.read', 'orders.create',
            'presence.read', 'presence.checkin',
            'records.read'
        ]::TEXT[])
) AS r("key", "permissions");

-- Сотрудники
ALTER TABLE "employees" ADD COLUMN "role_id" TEXT;
UPDATE "employees" e
SET "role_id" = pr."id"
FROM "portal_roles" pr
WHERE pr."portal_id" = e."portal_id"
  AND pr."key" = CASE e."role"::text WHEN 'portal_owner' THEN 'owner' ELSE e."role"::text END;
ALTER TABLE "employees" ALTER COLUMN "role_id" SET NOT NULL;
DROP INDEX "employees_role_idx";
ALTER TABLE "employees" DROP COLUMN "role";
CREATE INDEX "employees_role_id_idx" ON "employees"("role_id");
ALTER TABLE "employees" ADD CONSTRAINT "employees_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "portal_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Приглашения
ALTER TABLE "employee_invitations" ADD COLUMN "role_id" TEXT;
UPDATE "employee_invitations" i
SET "role_id" = pr."id"
FROM "portal_roles" pr
WHERE pr."portal_id" = i."portal_id"
  AND pr."key" = CASE i."role"::text WHEN 'portal_owner' THEN 'owner' ELSE i."role"::text END;
ALTER TABLE "employee_invitations" ALTER COLUMN "role_id" SET NOT NULL;
ALTER TABLE "employee_invitations" DROP COLUMN "role";
ALTER TABLE "employee_invitations" ADD CONSTRAINT "employee_invitations_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "portal_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DROP TYPE "EmployeeRole";
