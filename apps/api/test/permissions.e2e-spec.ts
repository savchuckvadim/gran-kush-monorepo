import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import bcrypt from "bcrypt";
import cookieParser from "cookie-parser";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";
import { enablePortalModule } from "./support/portal-modules";

jest.setTimeout(120_000);

const suffix = Date.now().toString(36);
const PASSWORD = "Password123";

const extractCookies = (res: request.Response): string => {
    const setCookie = res.headers["set-cookie"];
    const raw: string[] = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
    return raw.map((c) => c.split(";")[0]).join("; ");
};

type RoleRow = { id: string; key: string; permissions: string[]; isEditable: boolean };

/**
 * Права сотрудников (TASK-730…731): системные роли, закрытые по умолчанию разделы, своя роль клуба
 * и правило «не шире своих прав» при выдаче ролей.
 */
describe("Employee permissions (e2e)", () => {
    let app: INestApplication;
    let prisma: PrismaService;

    const slug = `perm-${suffix}`;
    let portalId: string;
    let owner: string;
    const staff: Record<string, { cookies: string; employeeId: string }> = {};

    const as = (cookies: string) => {
        const withClub = (req: request.Test) =>
            req.set("Cookie", cookies).set("X-Portal-Slug", slug);
        const server = () => request(app.getHttpServer());
        return {
            get: (url: string) => withClub(server().get(url)),
            post: (url: string) => withClub(server().post(url)),
            patch: (url: string) => withClub(server().patch(url)),
            delete: (url: string) => withClub(server().delete(url)),
        };
    };

    const roles = async (): Promise<RoleRow[]> =>
        (await as(owner).get("/crm/settings/roles")).body.roles as RoleRow[];

    /** Сотрудник с системной ролью: аккаунт, мост, вход. */
    const seedStaff = async (roleKey: string) => {
        const [definition, role] = await Promise.all([
            prisma.entityDefinition.findFirstOrThrow({
                where: { portalId, code: "employee" },
                select: { id: true },
            }),
            prisma.portalRole.findUniqueOrThrow({
                where: { portalId_key: { portalId, key: roleKey } },
            }),
        ]);
        const record = await prisma.entityRecord.create({
            data: { portalId, entityDefinitionId: definition.id },
        });
        const user = await prisma.user.create({
            data: {
                email: `${roleKey}-perm-${suffix}@test.local`,
                passwordHash: await bcrypt.hash(PASSWORD, 10),
                isActive: true,
                emailConfirmed: true,
            },
        });
        const employee = await prisma.employee.create({
            data: { userId: user.id, portalId, entityRecordId: record.id, roleId: role.id },
        });
        const login = await request(app.getHttpServer())
            .post("/crm/auth/login")
            .send({ email: user.email, password: PASSWORD });
        expect([200, 201]).toContain(login.status);
        staff[roleKey] = { cookies: extractCookies(login), employeeId: employee.id };
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        app.use(cookieParser());
        await app.init();
        prisma = app.get(PrismaService);

        const res = await request(app.getHttpServer())
            .post("/platform/portals/register")
            .send({
                name: slug,
                displayName: `Permissions ${suffix}`,
                email: `owner-perm-${suffix}@test.local`,
                password: PASSWORD,
                ownerName: "Owner",
                acceptTerms: true,
            });
        expect(res.status).toBe(201);
        portalId = res.body.portal.id as string;
        owner = extractCookies(res);
        await enablePortalModule(prisma, portalId, "finance");

        for (const key of ["admin", "manager", "employee"]) {
            await seedStaff(key);
        }
    });

    afterAll(async () => {
        await prisma.portal.deleteMany({ where: { name: slug } });
        await prisma.user.deleteMany({
            where: { email: { endsWith: `perm-${suffix}@test.local` } },
        });
        await app.close();
    });

    it("a club has four system roles; owner and admin have every permission and are locked", async () => {
        const res = await as(staff.employee.cookies).get("/crm/settings/roles");
        expect(res.status).toBe(200);
        const list = res.body.roles as RoleRow[];
        expect(list.map((role) => role.key)).toEqual(["owner", "admin", "manager", "employee"]);
        const catalogSize = (res.body.catalog as { permissions: string[] }[]).flatMap(
            (group) => group.permissions
        ).length;
        for (const key of ["owner", "admin"]) {
            const role = list.find((r) => r.key === key);
            expect(role?.permissions).toHaveLength(catalogSize);
            expect(role?.isEditable).toBe(false);
        }
    });

    it("an employee does not see finance, the team, document scans or QR issuing", async () => {
        const employee = as(staff.employee.cookies);
        expect((await employee.get("/crm/finance/transactions")).status).toBe(403);
        expect((await employee.get("/crm/employees")).status).toBe(403);
        expect((await employee.get("/crm/members/x/documents/y/preview")).status).toBe(403);
        expect((await employee.post("/crm/qr-codes/generate").send({})).status).toBe(403);
        expect((await employee.get("/crm/members")).status).toBe(200);

        expect((await as(staff.manager.cookies).get("/crm/finance/transactions")).status).toBe(200);
    });

    it("me lists the role and its permissions per club", async () => {
        const res = await as(staff.employee.cookies).get("/crm/auth/me");
        const employment = (
            res.body.employments as {
                portalId: string;
                role: { key: string };
                permissions: string[];
            }[]
        ).find((e) => e.portalId === portalId);
        expect(employment?.role.key).toBe("employee");
        expect(employment?.permissions).toContain("members.read");
        expect(employment?.permissions).not.toContain("finance.read");
    });

    it("a custom role grants exactly its permissions and is not deleted while in use", async () => {
        const created = await as(owner)
            .post("/crm/settings/roles")
            .send({ name: "Кассир", permissions: ["finance.read"] });
        expect(created.status).toBe(201);
        const cashier = created.body as RoleRow;
        expect(cashier.key).toMatch(/^custom_/);

        const assigned = await as(owner)
            .patch(`/crm/employees/${staff.employee.employeeId}`)
            .send({ role: cashier.key });
        expect(assigned.status).toBe(200);
        expect(assigned.body.role.key).toBe(cashier.key);

        const employee = as(staff.employee.cookies);
        expect((await employee.get("/crm/finance/transactions")).status).toBe(200);
        expect((await employee.get("/crm/members")).status).toBe(403);

        const inUse = await as(owner).delete(`/crm/settings/roles/${cashier.id}`);
        expect(inUse.status).toBe(409);
        expect(inUse.body.code).toBe("role_in_use");

        await as(owner)
            .patch(`/crm/employees/${staff.employee.employeeId}`)
            .send({ role: "employee" });
        expect((await as(owner).delete(`/crm/settings/roles/${cashier.id}`)).status).toBe(204);
    });

    it("nobody grants more than they have", async () => {
        const manager = (await roles()).find((role) => role.key === "manager") as RoleRow;
        const widened = await as(owner)
            .patch(`/crm/settings/roles/${manager.id}`)
            .send({ permissions: [...manager.permissions, "roles.manage", "employees.manage"] });
        expect(widened.status).toBe(200);

        const asManager = as(staff.manager.cookies);
        const tooWide = await asManager
            .post("/crm/settings/roles")
            .send({ name: "Финансист", permissions: ["finance.write"] });
        expect(tooWide.status).toBe(403);
        expect(tooWide.body.code).toBe("exceeds_own_permissions");

        // Выдать админа, тронуть админа или владельца менеджер не может
        expect(
            (
                await asManager
                    .patch(`/crm/employees/${staff.employee.employeeId}`)
                    .send({ role: "admin" })
            ).status
        ).toBe(403);
        expect((await asManager.delete(`/crm/employees/${staff.admin.employeeId}`)).status).toBe(
            403
        );

        // В пределах своих прав — можно
        const narrow = await asManager
            .post("/crm/settings/roles")
            .send({ name: "Стажёр", permissions: ["members.read"] });
        expect(narrow.status).toBe(201);
    });

    it("the owner role is never assigned and owner/admin permissions are not edited", async () => {
        const admin = (await roles()).find((role) => role.key === "admin") as RoleRow;
        const locked = await as(owner)
            .patch(`/crm/settings/roles/${admin.id}`)
            .send({ permissions: ["members.read"] });
        expect(locked.status).toBe(403);
        expect(locked.body.code).toBe("role_not_editable");

        const invite = await as(owner)
            .post("/crm/settings/invitations")
            .send({ email: `wannabe-perm-${suffix}@test.local`, role: "owner" });
        expect(invite.status).toBe(403);
        expect(invite.body.code).toBe("owner_role");
    });
});
