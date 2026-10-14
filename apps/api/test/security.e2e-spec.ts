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
        it("TASK-662: accepting an invitation for an existing account does not log it in", async () => {
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
        });

        it("TASK-663: adding an existing account by email does not expose its documents until the owner confirms", async () => {
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
            const consentToken = async (memberId: string): Promise<string> => {
                const row = await prisma.member.findUnique({
                    where: { id: memberId },
                    select: { consentToken: true },
                });
                if (!row?.consentToken) throw new Error("consent token missing");
                return row.consentToken;
            };
            const publicConsent = (token: string) =>
                request(app.getHttpServer()).get(`/public/consent/${token}`);

            try {
                const created = await as(clubA)
                    .post("/crm/members")
                    .send({ email: clubB.ownerEmail, fields: { first_name: "Victim" } });
                expect(created.status).toBe(201);
                expect(created.body.awaitingConsent).toBe(true);
                const memberId = created.body.memberId as string;

                const hidden = await as(clubA).get(`/crm/members/${memberId}`);
                expect(hidden.status).toBe(200);
                expect(hidden.body.consentStatus).toBe("pending");
                expect(hidden.body.documents).toEqual([]);
                expect(hidden.body.hasSignature).toBe(false);
                expect(
                    (
                        await as(clubA).get(
                            `/crm/members/${memberId}/documents/${document.id}/preview`
                        )
                    ).status
                ).toBe(404);
                expect(
                    (
                        await as(clubA)
                            .patch(`/crm/members/${memberId}/files`)
                            .attach("signature", Buffer.from("png"), "signature.png")
                    ).status
                ).toBe(403);

                const token = await consentToken(memberId);
                const info = await publicConsent(token);
                expect(info.status).toBe(200);
                expect(info.body.portalSlug).toBe(clubA.slug);
                expect(info.body.email).toBe(clubB.ownerEmail);
                expect(info.body.documents.map((d: { id: string }) => d.id)).toEqual([document.id]);

                const wrongPassword = await request(app.getHttpServer())
                    .post(`/public/consent/${token}/confirm`)
                    .send({ password: "Attacker123", shareDocumentIds: [document.id] });
                expect(wrongPassword.status).toBe(401);
                expect((await as(clubA).get(`/crm/members/${memberId}`)).body.documents).toEqual(
                    []
                );

                const confirmed = await request(app.getHttpServer())
                    .post(`/public/consent/${token}/confirm`)
                    .send({ password: PASSWORD, shareDocumentIds: [document.id] });
                expect(confirmed.status).toBe(200);
                expect(confirmed.body).toEqual({ portalSlug: clubA.slug, memberId });

                const visible = await as(clubA).get(`/crm/members/${memberId}`);
                expect(visible.body.consentStatus).toBe("confirmed");
                expect(visible.body.documents.map((d: { id: string }) => d.id)).toEqual([
                    document.id,
                ]);
                expect((await publicConsent(token)).status).toBe(404);
            } finally {
                await prisma.userDocument.delete({ where: { id: document.id } });
            }
        });

        it("TASK-663: the owner can decline; the resend rotates the token", async () => {
            const created = await as(clubB)
                .post("/crm/members")
                .send({ email: clubA.ownerEmail, fields: { first_name: "Owner A" } });
            expect(created.status).toBe(201);
            expect(created.body.awaitingConsent).toBe(true);
            const memberId = created.body.memberId as string;
            const first = await prisma.member.findUnique({
                where: { id: memberId },
                select: { consentToken: true },
            });

            expect((await as(clubB).post(`/crm/members/${memberId}/consent/resend`)).status).toBe(
                204
            );
            const rotated = await prisma.member.findUnique({
                where: { id: memberId },
                select: { consentToken: true },
            });
            expect(rotated?.consentToken).toBeTruthy();
            expect(rotated?.consentToken).not.toBe(first?.consentToken);
            expect(
                (
                    await request(app.getHttpServer()).get(
                        `/public/consent/${first?.consentToken as string}`
                    )
                ).status
            ).toBe(404);

            const declined = await request(app.getHttpServer())
                .post(`/public/consent/${rotated?.consentToken as string}/decline`)
                .send({ password: PASSWORD });
            expect(declined.status).toBe(200);
            expect(await prisma.member.findUnique({ where: { id: memberId } })).toBeNull();
            expect((await as(clubB).get(`/crm/members/${memberId}`)).status).toBe(404);
        });

        it("TASK-663: a registration link does not take someone else's account with a wrong password", async () => {
            const link = await as(clubA)
                .post("/crm/settings/registration-links")
                .send({ name: "sec-663", kind: "public_link" });
            expect(link.status).toBe(201);

            const res = await request(app.getHttpServer())
                .post(`/public/reg-links/${link.body.token as string}/register`)
                .send({
                    email: clubB.ownerEmail,
                    password: "Attacker123",
                    fields: { first_name: "X" },
                });
            expect(res.status).toBe(401);
        });

        it("TASK-665: POST /lk/auth/member/check is gone", async () => {
            const res = await request(app.getHttpServer())
                .post("/lk/auth/member/check")
                .send({ email: clubB.ownerEmail });
            expect(res.status).toBe(404);
        });

        it("TASK-666 M1: a stage of another club cannot be edited through my funnel", async () => {
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
        });
    });

    describe("TASK-662/664: invitations and claiming accounts", () => {
        /** Аккаунт без пароля, который завёл клуб A, с документом, загруженным клубом A. */
        const pendingAccountOfClubA = async (label: string) => {
            const email = `${label}-${suffix}@test.local`;
            const created = await as(clubA)
                .post("/crm/members")
                .send({ email, fields: { first_name: label } });
            expect(created.status).toBe(201);
            const user = await prisma.user.findUniqueOrThrow({ where: { email } });
            expect(user.passwordHash).toBeNull();
            const document = await prisma.userDocument.create({
                data: {
                    userId: user.id,
                    type: "passport",
                    side: "single",
                    number: `X-${label}`,
                    storagePath: `private/test/${suffix}/${label}.jpg`,
                },
            });
            await prisma.memberDocumentShare.create({
                data: { memberId: created.body.memberId as string, userDocumentId: document.id },
            });
            return { email, userId: user.id, documentId: document.id };
        };

        const memberLogin = (email: string, password: string) =>
            request(app.getHttpServer()).post("/lk/auth/login").send({ email, password });

        it("an invitation cannot hand out the owner role", async () => {
            const res = await as(clubA)
                .post("/crm/settings/invitations")
                .send({ email: `owner-wannabe-${suffix}@test.local`, role: "portal_owner" });
            expect(res.status).toBe(400);
        });

        it("the invitation token is shown once on creation and never in the list", async () => {
            const created = await as(clubA)
                .post("/crm/settings/invitations")
                .send({ email: `listed-${suffix}@test.local`, role: "employee" });
            expect(created.status).toBe(201);
            expect(typeof created.body.token).toBe("string");

            const list = await as(clubA).get("/crm/settings/invitations");
            expect(list.status).toBe(200);
            expect(list.body.invitations.length).toBeGreaterThan(0);
            for (const invitation of list.body.invitations) {
                expect(invitation).not.toHaveProperty("token");
            }
        });

        it("an invitation does not claim a passwordless account of another club", async () => {
            const victim = await pendingAccountOfClubA("invite-claim");

            const invitation = await as(clubB)
                .post("/crm/settings/invitations")
                .send({ email: victim.email, role: "admin" });
            expect(invitation.status).toBe(201);

            const accepted = await request(app.getHttpServer())
                .post(`/public/invitations/${invitation.body.token as string}/accept`)
                .send({ password: "Attacker123" });
            expect(accepted.status).toBe(409);
            expect(accepted.body).not.toHaveProperty("accessToken");

            const after = await prisma.user.findUniqueOrThrow({ where: { id: victim.userId } });
            expect(after.passwordHash).toBeNull();
            expect(
                await prisma.employee.count({
                    where: { userId: victim.userId, portalId: await portalId(clubB) },
                })
            ).toBe(0);
        });

        it("a registration link does not claim a passwordless account nor show its documents", async () => {
            const victim = await pendingAccountOfClubA("link-claim");
            const link = await as(clubB)
                .post("/crm/settings/registration-links")
                .send({ name: "sec-664", kind: "public_link" });
            expect(link.status).toBe(201);

            const res = await request(app.getHttpServer())
                .post(`/public/reg-links/${link.body.token as string}/register`)
                .send({
                    email: victim.email,
                    password: "Attacker123",
                    fields: { first_name: "Impostor" },
                });
            expect(res.status).toBe(201);
            expect(res.body.accountCreated).toBe(true);

            const after = await prisma.user.findUniqueOrThrow({ where: { id: victim.userId } });
            expect(after.passwordHash).toBeNull();
            // Вместо пароля из формы — письмо «задайте пароль»
            expect(after.resetPasswordToken).toBeTruthy();
            expect((await memberLogin(victim.email, "Attacker123")).status).toBe(401);

            const memberB = await as(clubB).get(`/crm/members/${res.body.memberId as string}`);
            expect(memberB.status).toBe(200);
            expect(memberB.body.documents).toEqual([]);
        });

        it("a new account from an invitation signs in only after confirming the email", async () => {
            const email = `invited-${suffix}@test.local`;
            const invitation = await as(clubA)
                .post("/crm/settings/invitations")
                .send({ email, role: "employee" });
            expect(invitation.status).toBe(201);

            const accepted = await request(app.getHttpServer())
                .post(`/public/invitations/${invitation.body.token as string}/accept`)
                .send({ password: PASSWORD, fields: { first_name: "Invited" } });
            expect(accepted.status).toBe(201);
            expect(accepted.body.awaitingEmailConfirmation).toBe(true);
            expect(accepted.body).not.toHaveProperty("accessToken");

            const login = (password: string) =>
                request(app.getHttpServer())
                    .post("/crm/auth/login")
                    .set("X-Portal-Slug", clubA.slug)
                    .send({ email, password });
            expect((await login("Wrong12345")).body.message).toBe("Invalid credentials");
            expect((await login(PASSWORD)).body.message).toBe("Email not confirmed");

            // Токен выписывается до отправки письма, которое в jest не рендерится
            const { emailVerificationToken } = await prisma.user.findUniqueOrThrow({
                where: { email },
            });
            expect(emailVerificationToken).toBeTruthy();
            const confirmed = await request(app.getHttpServer())
                .post("/crm/auth/confirm-email")
                .send({ token: emailVerificationToken });
            expect([200, 201]).toContain(confirmed.status);
            expect([200, 201]).toContain((await login(PASSWORD)).status);
        });

        it("a member signs in only after confirming the email", async () => {
            const email = `self-${suffix}@test.local`;
            const link = await as(clubA)
                .post("/crm/settings/registration-links")
                .send({ name: "sec-664-self", kind: "public_link" });
            const signUp = await request(app.getHttpServer())
                .post(`/public/reg-links/${link.body.token as string}/register`)
                .send({ email, password: "Squatter123", fields: { first_name: "Self" } });
            expect(signUp.status).toBe(201);

            // Неверный пароль не узнаёт, что адрес есть; верный — что он не подтверждён
            expect((await memberLogin(email, "Wrong12345")).body.message).toBe(
                "Invalid credentials"
            );
            const unconfirmed = await memberLogin(email, "Squatter123");
            expect(unconfirmed.status).toBe(401);
            expect(unconfirmed.body.message).toBe("Email not confirmed");

            const { emailVerificationToken } = await prisma.user.findUniqueOrThrow({
                where: { email },
            });
            expect(emailVerificationToken).toBeTruthy();
            const confirmed = await request(app.getHttpServer())
                .post("/lk/auth/member/confirm-email")
                .send({ token: emailVerificationToken });
            expect(confirmed.status).toBe(201);
            expect((await memberLogin(email, "Squatter123")).status).toBe(201);
        });
    });
});
