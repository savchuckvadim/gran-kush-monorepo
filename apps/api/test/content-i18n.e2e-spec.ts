import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import { Prisma } from "@prisma/client";
import cookieParser from "cookie-parser";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";
import { syncSystemLabelTranslations } from "../src/common/reference-data/system-label-translations.sync";

jest.setTimeout(120_000);

const suffix = Date.now().toString(36);
const PASSWORD = "Password123";

type SchemaField = { fieldKey: string; label: string | null };
type StatusItem = { id: string; key: string; label: string };

function extractCookies(res: request.Response): string {
    const setCookie = res.headers["set-cookie"];
    const raw: string[] = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
    return raw.map((c) => c.split(";")[0]).join("; ");
}

const labelOf = (fields: SchemaField[], fieldKey: string) =>
    fields.find((f) => f.fieldKey === fieldKey)?.label;

describe("Content i18n: system labels follow Accept-Language (e2e)", () => {
    let app: INestApplication;
    let prisma: PrismaService;

    let portalId: string;
    let slug: string;
    let cookies: string;

    const crm = (method: "get" | "patch", url: string, locale?: string) => {
        const req = request(app.getHttpServer())
            [method](url)
            .set("Cookie", cookies)
            .set("X-Portal-Slug", slug);
        return locale ? req.set("Accept-Language", locale) : req;
    };

    const memberFirstName = () =>
        prisma.fieldDefinition.findFirstOrThrow({
            where: { fieldKey: "first_name", entityDefinition: { portalId, code: "member" } },
        });

    const memberStatus = (key: string) =>
        prisma.statusItem.findFirstOrThrow({
            where: { key, statusSet: { portalId, code: "member_lifecycle" } },
        });

    const orderStage = (name: string) =>
        prisma.stage.findFirstOrThrow({
            where: { name, stageCategory: { portalId, entityDefinition: { code: "order" } } },
        });

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.use(cookieParser());
        await app.init();

        prisma = app.get(PrismaService);

        slug = `i18n-${suffix}`;
        const res = await request(app.getHttpServer())
            .post("/platform/portals/register")
            .send({
                name: slug,
                displayName: `Content i18n Test ${suffix}`,
                email: `owner-i18n-${suffix}@test.local`,
                password: PASSWORD,
                ownerName: "Owner",
                acceptTerms: true,
            });
        expect(res.status).toBe(201);
        portalId = res.body.portal.id as string;
        cookies = extractCookies(res);
    });

    afterAll(async () => {
        await prisma.portal.deleteMany({ where: { id: portalId } });
        await prisma.user.deleteMany({
            where: { email: { endsWith: `${suffix}@test.local` } },
        });
        await app.close();
    });

    it.each([
        ["es", "Nombre"],
        ["ru-RU,ru;q=0.9", "Имя"],
        ["en", "First name"],
        [undefined, "Nombre"],
        ["fr", "Nombre"],
    ])("CRM member form schema: Accept-Language %s → %s", async (locale, expected) => {
        const res = await crm("get", "/crm/members/form-schema?purpose=crm_create", locale);
        expect(res.status).toBe(200);
        const schema = (res.body.data ?? res.body) as { fields: SchemaField[] };
        expect(labelOf(schema.fields, "first_name")).toBe(expected);
    });

    it.each([
        ["es", "Nombre"],
        ["ru", "Имя"],
        ["en", "First name"],
    ])("public registration schema: %s → %s", async (locale, expected) => {
        const res = await request(app.getHttpServer())
            .get("/lk/auth/member/registration-schema")
            .set("X-Portal-Slug", slug)
            .set("Accept-Language", locale);
        expect(res.status).toBe(200);
        const schema = (res.body.data ?? res.body) as { fields: SchemaField[] };
        expect(labelOf(schema.fields, "first_name")).toBe(expected);
    });

    it("member status items are translated", async () => {
        const res = await crm("get", "/crm/settings/entities/member/status-items", "ru");
        expect(res.status).toBe(200);
        const items = (res.body.data ?? res.body) as StatusItem[];
        expect(items.map((i) => i.label)).toEqual([
            "В работе",
            "На рассмотрении",
            "Одобрен",
            "Отклонён",
        ]);
    });

    it("settings field list keeps raw label and labelI18n for editing", async () => {
        const res = await crm("get", "/crm/settings/entities/member/fields", "es");
        expect(res.status).toBe(200);
        const fields = (res.body.data ?? res.body) as {
            fieldKey: string;
            label: string;
            labelI18n: Record<string, string>;
        }[];
        const firstName = fields.find((f) => f.fieldKey === "first_name");
        expect(firstName?.label).toBe("First name");
        expect(firstName?.labelI18n).toEqual({ es: "Nombre", ru: "Имя", en: "First name" });
    });

    it("club labelOverride wins over the translation", async () => {
        const field = await memberFirstName();
        await prisma.fieldDefinition.update({
            where: { id: field.id },
            data: { labelOverride: "Nombre de pila" },
        });
        try {
            const res = await crm("get", "/crm/members/form-schema?purpose=crm_create", "ru");
            const schema = (res.body.data ?? res.body) as { fields: SchemaField[] };
            expect(labelOf(schema.fields, "first_name")).toBe("Nombre de pila");
        } finally {
            await prisma.fieldDefinition.update({
                where: { id: field.id },
                data: { labelOverride: null },
            });
        }
    });

    it("a status renamed by the club shows the club's word in every language", async () => {
        const item = await memberStatus("approved");
        const res = await crm(
            "patch",
            `/crm/settings/entities/member/status-sets/${item.statusSetId}/items/${item.id}`
        ).send({ label: "Socio activo" });
        expect(res.status).toBe(200);

        const list = await crm("get", "/crm/settings/entities/member/status-items", "ru");
        const items = (list.body.data ?? list.body) as StatusItem[];
        expect(items.find((i) => i.key === "approved")?.label).toBe("Socio activo");
    });

    it("startup sync fills translations of clubs created before them, once", async () => {
        const field = await memberFirstName();
        const pending = await memberStatus("pending");
        await prisma.fieldDefinition.update({
            where: { id: field.id },
            data: { labelI18n: Prisma.DbNull },
        });
        await prisma.statusItem.update({
            where: { id: pending.id },
            data: { labelI18n: Prisma.DbNull },
        });
        const preparing = await orderStage("Preparing");
        await prisma.stage.update({
            where: { id: preparing.id },
            data: { nameI18n: Prisma.DbNull },
        });

        const first = await syncSystemLabelTranslations(prisma);
        expect(first.fieldDefinitions).toBeGreaterThanOrEqual(1);
        expect(first.statusItems).toBeGreaterThanOrEqual(1);
        expect(first.stages).toBeGreaterThanOrEqual(1);
        expect((await orderStage("Preparing")).nameI18n).toEqual({
            es: "Preparando",
            ru: "Готовится",
            en: "Preparing",
        });

        expect((await memberFirstName()).labelI18n).toEqual({
            es: "Nombre",
            ru: "Имя",
            en: "First name",
        });
        expect((await memberStatus("pending")).labelI18n).toEqual({
            es: "Pendiente",
            ru: "На рассмотрении",
            en: "Pending",
        });
        // Переименованный клубом статус синк не трогает
        expect((await memberStatus("approved")).labelI18n).toBeNull();

        const second = await syncSystemLabelTranslations(prisma);
        expect(second).toEqual({
            templateFields: 0,
            templateStatusItems: 0,
            templateStages: 0,
            fieldDefinitions: 0,
            statusItems: 0,
            stages: 0,
        });
    });
});
