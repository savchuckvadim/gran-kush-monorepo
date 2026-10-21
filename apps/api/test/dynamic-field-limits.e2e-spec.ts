import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import cookieParser from "cookie-parser";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";
import { MailService } from "../src/modules/mail/application/services/mail.service";
import { DYNAMIC_FIELD_LIMITS } from "../src/modules/portal/crm/entity-fields/constants/dynamic-field-limits";

jest.setTimeout(120_000);

/** Почта без SMTP: каждый метод MailService — пустой jest.fn. */
const mailStub = () =>
    Object.fromEntries(
        Object.getOwnPropertyNames(MailService.prototype)
            .filter((name) => name !== "constructor")
            .map((name) => [name, jest.fn().mockResolvedValue(undefined)])
    );

const suffix = Date.now().toString(36);
const PASSWORD = "Password123";

const cookieHeader = (res: request.Response): string => {
    const raw = res.headers["set-cookie"];
    const cookies: string[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return cookies.map((c) => c.split(";")[0]).join("; ");
};

/**
 * Аудит 2026-10-12, TASK-666: M3 — поля профиля сотрудника проходят общий валидатор с потолками,
 * M4 — публичная карточка клуба есть только у клубов, опубликованных на карте.
 */
describe("Dynamic field limits and public club card (e2e)", () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let portalId = "";
    let cookies = "";
    const slug = `limits-${suffix}`;

    const createEmployee = (fields: Record<string, unknown>, tag: string) =>
        request(app.getHttpServer())
            .post("/crm/employees")
            .set("Cookie", cookies)
            .set("X-Portal-Slug", slug)
            .send({ email: `emp-${tag}-${suffix}@test.local`, role: "employee", fields });

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(MailService)
            .useValue(mailStub())
            .compile();

        app = moduleFixture.createNestApplication();
        app.use(cookieParser());
        await app.init();
        prisma = app.get(PrismaService);

        const res = await request(app.getHttpServer())
            .post("/platform/portals/register")
            .send({
                name: slug,
                displayName: `Limits ${suffix}`,
                email: `owner-${slug}@test.local`,
                password: PASSWORD,
                ownerName: "Owner",
                acceptTerms: true,
            });
        expect(res.status).toBe(201);
        portalId = res.body.portal.id as string;
        cookies = cookieHeader(res);
    });

    afterAll(async () => {
        await app?.close();
    });

    describe("M3: employee profile fields", () => {
        it("accepts a valid profile", async () => {
            const res = await createEmployee({ first_name: "Ana", phone: "+34600111222" }, "ok");
            expect(res.status).toBe(201);
        });

        it("rejects a value over the string ceiling", async () => {
            const tooLong = "a".repeat(DYNAMIC_FIELD_LIMITS.stringMaxLength + 1);
            const res = await createEmployee({ first_name: tooLong }, "long");
            expect(res.status).toBe(400);
            const user = await prisma.user.findUnique({
                where: { email: `emp-long-${suffix}@test.local` },
            });
            expect(user).toBeNull();
        });

        it("rejects fields the club does not have", async () => {
            const res = await createEmployee({ first_name: "Ana", not_a_field: "x" }, "unknown");
            expect(res.status).toBe(400);
        });

        it("rejects a value of the wrong type", async () => {
            const res = await createEmployee({ phone: { nested: "object" } }, "type");
            expect(res.status).toBe(400);
        });
    });

    describe("M4: public club card", () => {
        const card = () => request(app.getHttpServer()).get(`/public/portals/${slug}`);

        it("is hidden while the club is not on the map", async () => {
            expect((await card()).status).toBe(404);
        });

        it("opens once the club publishes itself", async () => {
            await prisma.portal.update({ where: { id: portalId }, data: { isListedOnMap: true } });
            const res = await card();
            expect(res.status).toBe(200);
            expect(res.body.slug).toBe(slug);
        });
    });
});
