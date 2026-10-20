import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import cookieParser from "cookie-parser";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";

import { crmSession } from "./support/sessions";

jest.setTimeout(120_000);

const suffix = Date.now().toString(36);
const PASSWORD = "Password123";

type Club = { slug: string; portalId: string; cookies: string };

const cookieHeader = (res: request.Response): string => {
    const raw = res.headers["set-cookie"];
    const cookies: string[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return cookies.map((c) => c.split(";")[0]).join("; ");
};

const ASSOCIATION_PROFILE = {
    legalForm: "association",
    vatRegime: "general",
    incomeTaxRegime: "corporate_partially_exempt",
    pricesIncludeTax: true,
    fiscalYearStartMonth: 1,
    legalName: "Asociación Cannábica Sol",
    taxId: "G12345674",
    iban: "ES91 2100 0418 4502 0005 1332",
    city: "Barcelona",
    gestorEmail: "gestor@example.com",
};

/**
 * Модуль «Финансы» и профиль организации (TASK-796): модуль выключен — маршруты отвечают 403
 * module_disabled; включает тот, у кого settings.club; профиль — пресет по типу клуба до сохранения,
 * реквизиты в базе шифром, номера проверяются по форме организации; клубы друг друга не видят.
 */
describe("Finance module and organization profile (e2e)", () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let clubA: Club;
    let clubB: Club;
    let manager: string;

    const crm = (club: Club, method: "get" | "put", path: string, cookies = club.cookies) =>
        request(app.getHttpServer())
            [method](path)
            .set("Cookie", cookies)
            .set("X-Portal-Slug", club.slug)
            .set("Origin", "http://localhost:5000");

    const register = async (label: string): Promise<Club> => {
        const slug = `fin${label}-${suffix}`;
        const res = await request(app.getHttpServer())
            .post("/platform/portals/register")
            .send({
                name: slug,
                displayName: `Finance ${label} ${suffix}`,
                email: `owner-fin-${label}-${suffix}@test.local`,
                password: PASSWORD,
                ownerName: "Owner",
                acceptTerms: true,
            });
        expect(res.status).toBe(201);
        return { slug, portalId: res.body.portal.id as string, cookies: cookieHeader(res) };
    };

    const seedManager = async (club: Club): Promise<string> => {
        const role = await prisma.portalRole.findFirstOrThrow({
            where: { portalId: club.portalId, key: "manager" },
        });
        const def = await prisma.entityDefinition.findFirstOrThrow({
            where: { portalId: club.portalId, code: "employee" },
        });
        const record = await prisma.entityRecord.create({
            data: { portalId: club.portalId, entityDefinitionId: def.id },
        });
        const user = await prisma.user.create({
            data: {
                email: `manager-fin-${suffix}@test.local`,
                passwordHash: "not-a-real-hash",
                isActive: true,
                emailConfirmed: true,
            },
        });
        await prisma.employee.create({
            data: {
                userId: user.id,
                portalId: club.portalId,
                entityRecordId: record.id,
                roleId: role.id,
                isActive: true,
            },
        });
        return (await crmSession(app, user.id)).cookies;
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        app.use(cookieParser());
        await app.init();
        prisma = app.get(PrismaService);

        clubA = await register("a");
        clubB = await register("b");
        manager = await seedManager(clubA);
    });

    afterAll(async () => {
        await prisma.portal.deleteMany({ where: { id: { in: [clubA.portalId, clubB.portalId] } } });
        await prisma.user.deleteMany({ where: { email: { endsWith: `${suffix}@test.local` } } });
        await app.close();
    });

    it("модуль выключен: финансы отвечают module_disabled, модуль виден как доступный", async () => {
        const modules = await crm(clubA, "get", "/crm/portal/modules");
        expect(modules.status).toBe(200);
        expect(modules.body).toEqual([
            expect.objectContaining({ code: "finance", available: true, enabled: false }),
        ]);

        const profile = await crm(clubA, "get", "/crm/finance/profile");
        expect(profile.status).toBe(403);
        expect(profile.body.code).toBe("module_disabled");
        expect((await crm(clubA, "get", "/crm/finance/transactions")).body.code).toBe(
            "module_disabled"
        );
        expect((await crm(clubA, "get", "/crm/portal/info")).body.modules).toEqual([]);
    });

    it("включает только тот, у кого settings.club; включение — событие для меню", async () => {
        const denied = await crm(clubA, "put", "/crm/portal/modules/finance", manager).send({
            enabled: true,
        });
        expect(denied.status).toBe(403);
        expect(denied.body.code).toBe("missing_permission");

        const enabled = await crm(clubA, "put", "/crm/portal/modules/finance").send({
            enabled: true,
        });
        expect(enabled.status).toBe(200);
        expect(enabled.body).toMatchObject({ code: "finance", enabled: true });
        expect((await crm(clubA, "get", "/crm/portal/info")).body.modules).toEqual(["finance"]);

        const event = await prisma.domainEvent.findFirst({
            where: { portalId: clubA.portalId, name: "portal.module_changed" },
        });
        expect(event?.payload).toEqual({ module: "finance", enabled: true });
        // включение второй раз ничего не меняет и событий не множит
        await crm(clubA, "put", "/crm/portal/modules/finance").send({ enabled: true });
        expect(
            await prisma.domainEvent.count({
                where: { portalId: clubA.portalId, name: "portal.module_changed" },
            })
        ).toBe(1);
    });

    it("до сохранения профиль — пресет клуба: asociación, IS частично освобождённой", async () => {
        const res = await crm(clubA, "get", "/crm/finance/profile");
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({
            configured: false,
            legalForm: "association",
            incomeTaxRegime: "corporate_partially_exempt",
            vatRegime: "general",
            pricesIncludeTax: true,
            country: "ES",
            currency: "EUR",
            legalName: null,
        });
    });

    it.each([
        [{ taxId: "G12345675" }, "invalid_tax_id"],
        [{ taxId: "B12345674" }, "tax_id_kind_mismatch"],
        [{ iban: "ES00 0000" }, "invalid_iban"],
        [{ incomeTaxRegime: "irpf_direct_simplified" }, "tax_regime_mismatch"],
    ])("отклоняет %j кодом %s", async (patch, code) => {
        const res = await crm(clubA, "put", "/crm/finance/profile").send({
            ...ASSOCIATION_PROFILE,
            ...patch,
        });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe(code);
    });

    it("сохраняет профиль; реквизиты в базе — шифр ключа клуба", async () => {
        const res = await crm(clubA, "put", "/crm/finance/profile").send(ASSOCIATION_PROFILE);
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({
            configured: true,
            legalName: "Asociación Cannábica Sol",
            taxId: "G12345674",
            iban: "ES9121000418450200051332",
        });

        const row = await prisma.organizationProfile.findUniqueOrThrow({
            where: { portalId: clubA.portalId },
        });
        for (const secret of ["Asociación", "G12345674", "ES9121000418450200051332", "gestor@"]) {
            expect(row.identity).not.toContain(secret);
        }
        expect(row.identity.startsWith("pc1.")).toBe(true);
        expect(await prisma.portalDataKey.count({ where: { portalId: clubA.portalId } })).toBe(1);

        const read = await crm(clubA, "get", "/crm/finance/profile");
        expect(read.body).toMatchObject({ configured: true, city: "Barcelona" });
        const event = await prisma.domainEvent.findFirst({
            where: { portalId: clubA.portalId, name: "finance.profile_updated" },
        });
        expect(JSON.stringify(event?.payload)).not.toContain("G12345674");
    });

    it("менеджер видит профиль, но менять его — finance.admin", async () => {
        expect((await crm(clubA, "get", "/crm/finance/profile", manager)).status).toBe(200);
        const res = await crm(clubA, "put", "/crm/finance/profile", manager).send(
            ASSOCIATION_PROFILE
        );
        expect(res.status).toBe(403);
        expect(res.body.errors).toEqual(["finance.admin"]);
    });

    it("другой клуб: свой модуль, свой пресет, чужих реквизитов не видно", async () => {
        expect((await crm(clubB, "get", "/crm/finance/profile")).body.code).toBe("module_disabled");
        await crm(clubB, "put", "/crm/portal/modules/finance").send({ enabled: true });

        const res = await crm(clubB, "get", "/crm/finance/profile");
        expect(res.body).toMatchObject({ configured: false, legalName: null, taxId: null });
        // реквизиты клуба A не расшифровать в строке клуба B
        const rowA = await prisma.organizationProfile.findUniqueOrThrow({
            where: { portalId: clubA.portalId },
        });
        await prisma.organizationProfile.create({
            data: {
                portalId: clubB.portalId,
                legalForm: "association",
                vatRegime: "general",
                incomeTaxRegime: "corporate_partially_exempt",
                identity: rowA.identity,
            },
        });
        expect((await crm(clubB, "get", "/crm/finance/profile")).status).toBe(500);
        await prisma.organizationProfile.delete({ where: { portalId: clubB.portalId } });
    });

    it("autónomo: финансовый год всегда с января, номер — NIF человека", async () => {
        const res = await crm(clubB, "put", "/crm/finance/profile").send({
            legalForm: "self_employed",
            vatRegime: "general",
            incomeTaxRegime: "irpf_direct_simplified",
            pricesIncludeTax: true,
            fiscalYearStartMonth: 7,
            legalName: "Marta Ruiz",
            taxId: "12345678Z",
        });
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({
            legalForm: "self_employed",
            fiscalYearStartMonth: 1,
            taxId: "12345678Z",
        });
    });

    it("выключение закрывает маршруты, но данные остаются", async () => {
        await crm(clubA, "put", "/crm/portal/modules/finance").send({ enabled: false });
        expect((await crm(clubA, "get", "/crm/finance/profile")).body.code).toBe("module_disabled");

        await crm(clubA, "put", "/crm/portal/modules/finance").send({ enabled: true });
        expect((await crm(clubA, "get", "/crm/finance/profile")).body).toMatchObject({
            configured: true,
            taxId: "G12345674",
        });
    });
});
