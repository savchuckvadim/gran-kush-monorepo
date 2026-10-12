import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import cookieParser from "cookie-parser";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";

jest.setTimeout(120_000);

const suffix = Date.now().toString(36);
const PASSWORD = "Password123";

const cookieHeader = (res: request.Response): string => {
    const raw = res.headers["set-cookie"];
    const cookies: string[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return cookies.map((c) => c.split(";")[0]).join("; ");
};

/**
 * Ссылки-формы регистрации: личная ссылка с предзаполнением, статусы, отзыв,
 * онлайн-зрители и постраничный список.
 */
describe("Registration links (e2e)", () => {
    let app: INestApplication;
    let prisma: PrismaService;

    const slug = `reglinks-${suffix}`;
    const ownerEmail = `owner-${slug}@test.local`;
    let cookies: string;

    const admin = () => ({
        get: (url: string) =>
            request(app.getHttpServer()).get(url).set("Cookie", cookies).set("X-Portal-Slug", slug),
        post: (url: string) =>
            request(app.getHttpServer())
                .post(url)
                .set("Cookie", cookies)
                .set("X-Portal-Slug", slug),
        patch: (url: string) =>
            request(app.getHttpServer())
                .patch(url)
                .set("Cookie", cookies)
                .set("X-Portal-Slug", slug),
    });

    const createLink = async (body: Record<string, unknown>) => {
        const res = await admin().post("/crm/settings/registration-links").send(body);
        expect(res.status).toBe(201);
        return res.body as { id: string; token: string; status: string; hasPrefill: boolean };
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
                displayName: `Reg Links ${suffix}`,
                email: ownerEmail,
                password: PASSWORD,
                ownerName: "Owner",
                acceptTerms: true,
            });
        expect(res.status).toBe(201);
        cookies = cookieHeader(res);
    });

    afterAll(async () => {
        await prisma.portal.deleteMany({ where: { name: slug } });
        await prisma.user.deleteMany({ where: { email: { endsWith: `${suffix}@test.local` } } });
        await app.close();
    });

    describe("personal link with prefill", () => {
        it("opens the public form with the stored values and is spent after one sign-up", async () => {
            const link = await createLink({
                name: "Для Ñandú",
                kind: "personal",
                prefill: {
                    email: "Nandu@Example.com",
                    fields: { first_name: "Ñandú", last_name: "" },
                },
            });
            expect(link.hasPrefill).toBe(true);
            expect(link.status).toBe("ready");

            const info = await request(app.getHttpServer()).get(`/public/reg-links/${link.token}`);
            expect(info.status).toBe(200);
            expect(info.body.prefill).toEqual({
                email: "nandu@example.com",
                fields: { first_name: "Ñandú" },
            });

            const signUp = await request(app.getHttpServer())
                .post(`/public/reg-links/${link.token}/register`)
                .send({
                    email: `nandu-${suffix}@test.local`,
                    password: PASSWORD,
                    fields: { first_name: "Ñandú" },
                });
            expect(signUp.status).toBe(201);

            const again = await request(app.getHttpServer()).get(`/public/reg-links/${link.token}`);
            expect(again.status).toBe(404);

            const list = await admin().get("/crm/settings/registration-links?status=exhausted");
            expect(list.status).toBe(200);
            expect(list.body.links.map((l: { id: string }) => l.id)).toContain(link.id);
        });

        it("rejects unknown prefill keys", async () => {
            const res = await admin()
                .post("/crm/settings/registration-links")
                .send({
                    name: "x",
                    kind: "personal",
                    prefill: { email: "a@b.c", portalId: "evil" },
                });
            expect(res.status).toBe(400);
        });
    });

    describe("revoke", () => {
        it("is final: the public page stops opening and the link cannot be re-enabled", async () => {
            const link = await createLink({ name: "Стойка", kind: "public_link" });

            const revoked = await admin().post(
                `/crm/settings/registration-links/${link.id}/revoke`
            );
            expect(revoked.status).toBe(201);
            expect(revoked.body.status).toBe("revoked");

            const info = await request(app.getHttpServer()).get(`/public/reg-links/${link.token}`);
            expect(info.status).toBe(404);

            const reenabled = await admin()
                .patch(`/crm/settings/registration-links/${link.id}`)
                .send({ isActive: true });
            expect(reenabled.status).toBe(200);
            expect(reenabled.body.status).toBe("revoked");
        });
    });

    describe("presence", () => {
        it("counts viewers while the form is open and drops them on leave", async () => {
            const link = await createLink({ name: "Планшет", kind: "kiosk" });
            const ping = (viewerId: string) =>
                request(app.getHttpServer())
                    .post(`/public/reg-links/${link.token}/ping`)
                    .send({ viewerId });

            expect((await ping("tab-aaaa-1111")).body.online).toBe(1);
            expect((await ping("tab-bbbb-2222")).body.online).toBe(2);
            expect((await ping("tab-aaaa-1111")).body.online).toBe(2);

            const list = await admin().get("/crm/settings/registration-links?limit=50");
            const row = list.body.links.find((l: { id: string }) => l.id === link.id);
            expect(row.online).toBe(2);

            const left = await request(app.getHttpServer())
                .post(`/public/reg-links/${link.token}/leave`)
                .send({ viewerId: "tab-aaaa-1111" });
            expect(left.body.online).toBe(1);
        });

        it("ignores heartbeats for a dead link", async () => {
            const res = await request(app.getHttpServer())
                .post(`/public/reg-links/no-such-token/ping`)
                .send({ viewerId: "tab-cccc-3333" });
            expect(res.status).toBe(404);
        });
    });

    describe("list", () => {
        it("paginates and filters by status", async () => {
            const disabled = await createLink({ name: "Выключенная" });
            await admin()
                .patch(`/crm/settings/registration-links/${disabled.id}`)
                .send({ isActive: false });

            const page = await admin().get("/crm/settings/registration-links?page=1&limit=2");
            expect(page.status).toBe(200);
            expect(page.body.links).toHaveLength(2);
            expect(page.body.total).toBeGreaterThanOrEqual(4);
            expect(page.body.totalPages).toBeGreaterThanOrEqual(2);
            expect(page.body.links[0]).toEqual(
                expect.objectContaining({
                    status: expect.any(String),
                    online: expect.any(Number),
                    createdBy: expect.objectContaining({ email: ownerEmail }),
                })
            );

            const onlyDisabled = await admin().get(
                "/crm/settings/registration-links?status=disabled"
            );
            expect(onlyDisabled.body.links.map((l: { id: string }) => l.id)).toEqual([disabled.id]);

            const ready = await admin().get("/crm/settings/registration-links?status=ready");
            expect(ready.body.links.map((l: { id: string }) => l.id)).not.toContain(disabled.id);
        });
    });
});
