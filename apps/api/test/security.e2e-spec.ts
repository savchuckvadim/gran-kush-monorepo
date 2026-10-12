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

type Club = { slug: string; ownerEmail: string; cookies: string };

/**
 * Проверки безопасности (TASK-661, documentation/tasks/security-audit.md, аудит 2026-10-12).
 * Что уже держится — обычные тесты. Известные дыры — `it.failing`: тест падает ровно тогда,
 * когда дыра закрыта; после фикса его переводят в обычный `it`.
 */
describe("Security (e2e)", () => {
    let app: INestApplication;
    let prisma: PrismaService;

    const clubA: Club = {
        slug: `sec-a-${suffix}`,
        ownerEmail: `owner-a-${suffix}@test.local`,
        cookies: "",
    };
    const clubB: Club = {
        slug: `sec-b-${suffix}`,
        ownerEmail: `owner-b-${suffix}@test.local`,
        cookies: "",
    };

    const as = (club: Club) => {
        const withAuth = (req: request.Test) =>
            req.set("Cookie", club.cookies).set("X-Portal-Slug", club.slug);
        return {
            get: (url: string) => withAuth(request(app.getHttpServer()).get(url)),
            post: (url: string) => withAuth(request(app.getHttpServer()).post(url)),
            patch: (url: string) => withAuth(request(app.getHttpServer()).patch(url)),
        };
    };

    const registerClub = async (club: Club) => {
        const res = await request(app.getHttpServer())
            .post("/platform/portals/register")
            .send({
                name: club.slug,
                displayName: `Security ${club.slug}`,
                email: club.ownerEmail,
                password: PASSWORD,
                ownerName: "Owner",
                acceptTerms: true,
            });
        expect(res.status).toBe(201);
        club.cookies = cookieHeader(res);
    };

    const portalId = async (club: Club): Promise<string> => {
        const portal = await prisma.portal.findFirst({
            where: { name: club.slug },
            select: { id: true },
        });
        if (!portal) throw new Error(`portal ${club.slug} not found`);
        return portal.id;
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.use(cookieParser());
        await app.init();
        prisma = app.get(PrismaService);

        await registerClub(clubA);
        await registerClub(clubB);
    });

    afterAll(async () => {
        await prisma.portal.deleteMany({ where: { name: { in: [clubA.slug, clubB.slug] } } });
        await prisma.user.deleteMany({ where: { email: { endsWith: `${suffix}@test.local` } } });
        await app.close();
    });

    describe("holds today", () => {
        it("rejects fields the DTO does not declare (mass assignment)", async () => {
            const res = await as(clubA)
                .post("/crm/members")
                .send({
                    email: `mass-${suffix}@test.local`,
                    fields: { first_name: "X" },
                    role: "admin",
                });
            expect(res.status).toBe(400);
            expect(res.body.errors.join(" ")).toContain("role");
        });

        it("treats SQL and LIKE characters in the search as plain text", async () => {
            for (const q of ["' OR 1=1 --", "%", "_", "\\", "%'; DROP TABLE members; --"]) {
                const res = await as(clubA).get("/crm/members").query({ q });
                expect(res.status).toBe(200);
                expect(res.body.total).toBe(0);
            }
        });

        it("rejects a filter on a field of another club", async () => {
            const field = await as(clubB)
                .post("/crm/settings/entities/member/fields")
                .send({ fieldKey: "sec_only_b", type: "string", label: "Only B" });
            expect(field.status).toBe(201);

            const res = await as(clubA)
                .get("/crm/members")
                .query({
                    filter: JSON.stringify([{ field: "sec_only_b", op: "contains", value: "x" }]),
                });
            expect(res.status).toBe(400);
        });

        it("does not reach a member of another club by id", async () => {
            const created = await as(clubB)
                .post("/crm/members")
                .send({ email: `member-b-${suffix}@test.local`, fields: { first_name: "B" } });
            expect(created.status).toBe(201);

            const res = await as(clubA).get(`/crm/members/${created.body.memberId as string}`);
            expect(res.status).toBe(404);
        });

        it("exposes only the form through a public registration link", async () => {
            const link = await as(clubA)
                .post("/crm/settings/registration-links")
                .send({ name: "sec", kind: "public_link" });
            expect(link.status).toBe(201);

            const info = await request(app.getHttpServer()).get(
                `/public/reg-links/${link.body.token as string}`
            );
            expect(info.status).toBe(200);
            for (const key of [
                "portalId",
                "createdBy",
                "createdByEmployee",
                "usesCount",
                "maxUses",
                "token",
            ]) {
                expect(info.body).not.toHaveProperty(key);
            }
        });
    });

    describe("known holes (it.failing until fixed)", () => {
        it(
            "TASK-662: accepting an invitation for an existing account does not log it in",
            async () => {
                const invitation = await as(clubA)
                    .post("/crm/settings/invitations")
                    .send({ email: clubB.ownerEmail, role: "admin" });
                expect(invitation.status).toBe(201);

                const accepted = await request(app.getHttpServer())
                    .post(`/public/invitations/${invitation.body.token as string}/accept`)
                    .send({ password: "Attacker123" });

                expect([401, 403, 409]).toContain(accepted.status);
                expect(accepted.body).not.toHaveProperty("accessToken");
                expect(accepted.body).not.toHaveProperty("refreshToken");
            }
        );

        it.failing(
            "TASK-663: adding an existing account by email does not expose its documents",
            async () => {
                const victim = await prisma.user.findUnique({ where: { email: clubB.ownerEmail } });
                if (!victim) throw new Error("victim user missing");
                const document = await prisma.userDocument.create({
                    data: {
                        userId: victim.id,
                        type: "passport",
                        side: "single",
                        number: "X-SECRET-1",
                        storagePath: `private/test/${suffix}/passport.jpg`,
                    },
                });

                try {
                    const created = await as(clubA)
                        .post("/crm/members")
                        .send({ email: clubB.ownerEmail, fields: { first_name: "Victim" } });
                    // the fix may answer with "waiting for the account's consent" instead of a member
                    if (created.status === 201) {
                        const full = await as(clubA).get(
                            `/crm/members/${created.body.memberId as string}`
                        );
                        expect(full.status).toBe(200);
                        expect(full.body.documents).toEqual([]);
                    }
                } finally {
                    await prisma.userDocument.delete({ where: { id: document.id } });
                }
            }
        );

        it("TASK-665: POST /lk/auth/member/check is gone", async () => {
            const res = await request(app.getHttpServer())
                .post("/lk/auth/member/check")
                .send({ email: clubB.ownerEmail });
            expect(res.status).toBe(404);
        });

        it(
            "TASK-666 M1: a stage of another club cannot be edited through my funnel",
            async () => {
                const funnel = (code: string) => ({
                    code,
                    name: code,
                    stages: [{ name: `${code} first`, sortOrder: 0, semantic: "NEW" }],
                });
                expect(
                    (
                        await as(clubA)
                            .post("/crm/settings/entities/order/stage-categories")
                            .send(funnel("sec_a"))
                    ).status
                ).toBe(201);
                expect(
                    (
                        await as(clubB)
                            .post("/crm/settings/entities/order/stage-categories")
                            .send(funnel("sec_b"))
                    ).status
                ).toBe(201);

                const stageA = await prisma.stage.findFirst({
                    where: { stageCategory: { portalId: await portalId(clubA), code: "sec_a" } },
                });
                const categoryB = await prisma.stageCategory.findFirst({
                    where: { portalId: await portalId(clubB), code: "sec_b" },
                });
                if (!stageA || !categoryB) throw new Error("funnels missing");

                const res = await as(clubB)
                    .patch(`/crm/settings/entities/order/stage-categories/${categoryB.id}`)
                    .send({
                        stages: [{ id: stageA.id, name: "pwned", sortOrder: 0, semantic: "NEW" }],
                    });

                expect([400, 404]).toContain(res.status);
                const after = await prisma.stage.findUnique({ where: { id: stageA.id } });
                expect(after?.name).toBe(stageA.name);
            }
        );
    });
});
