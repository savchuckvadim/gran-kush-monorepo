import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import * as bcrypt from "bcrypt";
import cookieParser from "cookie-parser";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";
import { UserDocumentRepository } from "../src/modules/account/domain/repositories/user-document-repository.interface";
import { EmployeeAuthService } from "../src/modules/portal/auth/employees/application/services/employee-auth.service";
import { MemberAuthService } from "../src/modules/portal/auth/members/application/services/member-auth.service";

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

        it("TASK-678: членство из клейм-регистрации ждёт, пока владелец задаст пароль", async () => {
            const email = `claim-reg-${suffix}@test.local`;
            // Клуб A заводит pending_claim аккаунт (без пароля)
            const created = await as(clubA)
                .post("/crm/members")
                .send({ email, fields: { first_name: "Novice" } });
            expect(created.status).toBe(201);

            // «Самозванец» регистрируется этим email в клубе B: членство не активируется
            const reg = await request(app.getHttpServer())
                .post("/cabinet/auth/member/register")
                .set("X-Portal-Slug", clubB.slug)
                .send({ email, password: "Attacker123", fields: { first_name: "Impostor" } });
            expect(reg.status).toBe(201);
            const memberId = reg.body.memberId as string;
            const pending = await prisma.member.findUnique({
                where: { id: memberId },
                select: { consentStatus: true, consentToken: true },
            });
            expect(pending?.consentStatus).toBe("pending");
            expect(pending?.consentToken).toBeTruthy();

            // Пароль «самозванца» не установлен — войти им нельзя
            const login = await request(app.getHttpServer())
                .post("/cabinet/auth/login")
                .send({ email, password: "Attacker123" });
            expect(login.status).toBe(401);

            // Владелец задаёт пароль по ссылке из письма — это клейм и подтверждение членства
            const userRow = await prisma.user.findUnique({
                where: { email },
                select: { resetPasswordToken: true },
            });
            const confirm = await request(app.getHttpServer())
                .post("/cabinet/auth/password/reset/confirm")
                .send({
                    token: userRow?.resetPasswordToken as string,
                    newPassword: "OwnerPass123",
                });
            expect(confirm.status).toBe(201);

            const after = await prisma.member.findUnique({
                where: { id: memberId },
                select: { consentStatus: true },
            });
            expect(after?.consentStatus).toBe("confirmed");

            // Документы при этом клубу B не расшариваются
            const shares = await prisma.memberDocumentShare.findMany({
                where: { memberId },
            });
            expect(shares).toEqual([]);
        });

        it("TASK-665: POST /cabinet/auth/member/check is gone", async () => {
            const res = await request(app.getHttpServer())
                .post("/cabinet/auth/member/check")
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
            request(app.getHttpServer()).post("/cabinet/auth/login").send({ email, password });

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
            expect(accepted.status).toBe(200);
            expect(accepted.body.outcome).toBe("password_setup_sent");
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
            expect(accepted.status).toBe(200);
            expect(accepted.body.outcome).toBe("accepted_pending_email");
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
                .post("/cabinet/auth/member/confirm-email")
                .send({ token: emailVerificationToken });
            expect(confirmed.status).toBe(201);
            expect((await memberLogin(email, "Squatter123")).status).toBe(201);
        });
    });

    describe("TASK-702/703: ownership and consent without a password", () => {
        const consentRow = (memberId: string) =>
            prisma.member.findUniqueOrThrow({
                where: { id: memberId },
                select: { consentStatus: true, consentToken: true, isActive: true },
            });

        /** Аккаунт только с Google: владелец есть, пароля нет. */
        const googleOnlyAccount = async (label: string) => {
            const email = `${label}-${suffix}@test.local`;
            const user = await prisma.user.create({
                data: {
                    email,
                    passwordHash: null,
                    status: "active",
                    isActive: true,
                    emailConfirmed: true,
                },
            });
            await prisma.userIdentity.create({
                data: {
                    userId: user.id,
                    provider: "google",
                    providerUserId: `sub-${label}-${suffix}`,
                    email,
                    emailVerified: true,
                },
            });
            return { email, userId: user.id };
        };

        /**
         * Подтверждённый аккаунт с паролем и сессией кабинета. Создаётся напрямую в БД: письма
         * подтверждения и регистрация по ссылке упираются в лимиты (EMAIL/SIGNUP) соседних тестов.
         */
        const memberWithSession = async (label: string) => {
            const email = `${label}-${suffix}@test.local`;
            const user = await prisma.user.create({
                data: {
                    email,
                    passwordHash: await bcrypt.hash(PASSWORD, 4),
                    status: "active",
                    isActive: true,
                    emailConfirmed: true,
                },
            });
            // Токены выписываются напрямую: настоящий вход упирается в лимит логинов (AUTH) на сьют
            const tokens = await app
                .get(MemberAuthService)
                .generateTokens({ id: user.id, email }, `device-${label}-${suffix}`);
            return {
                email,
                userId: user.id,
                cookies: `member_access_token=${tokens.accessToken}`,
            };
        };

        const lk = (cookies: string) => ({
            get: (url: string, club?: Club) => {
                const req = request(app.getHttpServer()).get(url).set("Cookie", cookies);
                return club ? req.set("X-Portal-Slug", club.slug) : req;
            },
            post: (url: string, club?: Club) => {
                const req = request(app.getHttpServer()).post(url).set("Cookie", cookies);
                return club ? req.set("X-Portal-Slug", club.slug) : req;
            },
            delete: (url: string) =>
                request(app.getHttpServer()).delete(url).set("Cookie", cookies),
        });

        describe("TASK-707: accepting an invitation with a session", () => {
            const invite = async (email: string): Promise<string> => {
                const res = await as(clubB)
                    .post("/crm/settings/invitations")
                    .send({ email, role: "employee" });
                expect(res.status).toBe(201);
                return res.body.token as string;
            };
            const employeesOfClubB = async (userId: string) =>
                prisma.employee.count({ where: { userId, portalId: await portalId(clubB) } });

            it("a cabinet session of the invited address accepts it and gets a CRM session", async () => {
                const member = await memberWithSession("inv-session");
                const token = await invite(member.email);

                const res = await lk(member.cookies)
                    .post(`/cabinet/invitations/${token}/accept`)
                    .send({});

                expect(res.status).toBe(200);
                expect(res.body.outcome).toBe("accepted");
                const cookies = cookieHeader(res);
                expect(cookies).toContain("crm_access_token=");
                const me = await request(app.getHttpServer())
                    .get("/crm/auth/me")
                    .set("Cookie", cookies);
                expect(me.status).toBe(200);
                expect(await employeesOfClubB(member.userId)).toBe(1);
            });

            it("a CRM session of the invited address accepts it without a password", async () => {
                const email = `inv-crm-${suffix}@test.local`;
                const user = await prisma.user.create({
                    data: {
                        email,
                        passwordHash: null,
                        status: "active",
                        isActive: true,
                        emailConfirmed: true,
                    },
                });
                const tokens = await app
                    .get(EmployeeAuthService)
                    .generateTokens({ id: user.id, email }, `device-inv-crm-${suffix}`);
                const token = await invite(email);

                const res = await request(app.getHttpServer())
                    .post(`/crm/auth/invitations/${token}/accept`)
                    .set("Cookie", `crm_access_token=${tokens.accessToken}`)
                    .send({});

                expect(res.status).toBe(200);
                expect(res.body.outcome).toBe("accepted");
                expect(await employeesOfClubB(user.id)).toBe(1);
            });

            it("a session of another address is refused and leaves the invitation pending", async () => {
                const stranger = await memberWithSession("inv-stranger");
                const token = await invite(`inv-target-${suffix}@test.local`);

                const res = await lk(stranger.cookies)
                    .post(`/cabinet/invitations/${token}/accept`)
                    .send({});

                expect(res.status).toBe(403);
                expect(await employeesOfClubB(stranger.userId)).toBe(0);
                const invitation = await prisma.employeeInvitation.findUniqueOrThrow({
                    where: { token },
                });
                expect(invitation.status).toBe("pending");
            });

            it("an unconfirmed account cannot accept with its session", async () => {
                const email = `inv-unconfirmed-${suffix}@test.local`;
                const user = await prisma.user.create({
                    data: {
                        email,
                        passwordHash: null,
                        status: "active",
                        isActive: true,
                        emailConfirmed: false,
                    },
                });
                const tokens = await app
                    .get(EmployeeAuthService)
                    .generateTokens({ id: user.id, email }, `device-inv-unconf-${suffix}`);
                const token = await invite(email);

                const res = await request(app.getHttpServer())
                    .post(`/crm/auth/invitations/${token}/accept`)
                    .set("Cookie", `crm_access_token=${tokens.accessToken}`)
                    .send({});

                expect(res.status).toBe(401);
                expect(cookieHeader(res)).not.toContain("crm_access_token=");
                expect(await employeesOfClubB(user.id)).toBe(0);
            });
        });

        it("a club adding a Google-only account waits for its consent; the token from the email is enough", async () => {
            const owner = await googleOnlyAccount("g-only");

            const created = await as(clubA)
                .post("/crm/members")
                .send({ email: owner.email, fields: { first_name: "Google" } });
            expect(created.status).toBe(201);
            expect(created.body.awaitingConsent).toBe(true);
            const memberId = created.body.memberId as string;
            const pending = await consentRow(memberId);
            expect(pending.consentStatus).toBe("pending");

            const info = await request(app.getHttpServer()).get(
                `/public/consent/${pending.consentToken as string}`
            );
            expect(info.status).toBe(200);
            expect(info.body.requiresPassword).toBe(false);

            const confirmed = await request(app.getHttpServer())
                .post(`/public/consent/${pending.consentToken as string}/confirm`)
                .send({});
            expect(confirmed.status).toBe(200);
            expect((await consentRow(memberId)).consentStatus).toBe("confirmed");
        });

        it("a password account still needs its password on the consent page", async () => {
            const owner = await memberWithSession("pw-consent");
            const created = await as(clubB)
                .post("/crm/members")
                .send({ email: owner.email, fields: { first_name: "Password" } });
            expect(created.body.awaitingConsent).toBe(true);
            const memberId = created.body.memberId as string;
            const token = (await consentRow(memberId)).consentToken as string;

            const info = await request(app.getHttpServer()).get(`/public/consent/${token}`);
            expect(info.status).toBe(200);
            expect(info.body.requiresPassword).toBe(true);

            const noPassword = await request(app.getHttpServer())
                .post(`/public/consent/${token}/confirm`)
                .send({});
            expect(noPassword.status).toBe(401);
            expect((await consentRow(memberId)).consentStatus).toBe("pending");

            const withPassword = await request(app.getHttpServer())
                .post(`/public/consent/${token}/confirm`)
                .send({ password: PASSWORD });
            expect(withPassword.status).toBe(200);
        });

        it("a club adding an account another club created waits for its owner", async () => {
            const email = `other-club-${suffix}@test.local`;
            const first = await as(clubA)
                .post("/crm/members")
                .send({ email, fields: { first_name: "Shared" } });
            expect(first.status).toBe(201);
            expect(first.body.awaitingConsent).toBe(false);

            const second = await as(clubB)
                .post("/crm/members")
                .send({ email, fields: { first_name: "Shared" } });
            expect(second.status).toBe(201);
            expect(second.body.awaitingConsent).toBe(true);
            expect((await consentRow(second.body.memberId as string)).consentStatus).toBe(
                "pending"
            );
        });

        it("an existing account is not attached as an employee without an invitation", async () => {
            const owner = await googleOnlyAccount("emp-google");
            const direct = await as(clubA)
                .post("/crm/employees")
                .send({ email: owner.email, role: "employee", fields: {} });
            expect(direct.status).toBe(409);
            expect(
                await prisma.employee.count({
                    where: { userId: owner.userId, portalId: await portalId(clubA) },
                })
            ).toBe(0);

            const fresh = await as(clubA)
                .post("/crm/employees")
                .send({ email: `emp-new-${suffix}@test.local`, role: "employee", fields: {} });
            expect(fresh.status).toBe(201);
            expect(fresh.body.isNewUser).toBe(true);
        });

        it("the owner confirms under their own session; until then the club is closed to the account", async () => {
            const owner = await memberWithSession("sess-confirm");
            const created = await as(clubB)
                .post("/crm/members")
                .send({ email: owner.email, fields: { first_name: "Session" } });
            expect(created.status).toBe(201);
            expect(created.body.awaitingConsent).toBe(true);
            const memberId = created.body.memberId as string;

            const closed = await lk(owner.cookies).get("/cabinet/members/me", clubB);
            expect(closed.status).toBe(403);

            const list = await lk(owner.cookies).get("/cabinet/memberships");
            expect(list.status).toBe(200);
            const entry = (
                list.body.memberships as { memberId: string; consentStatus: string; slug: string }[]
            ).find((membership) => membership.memberId === memberId);
            expect(entry).toMatchObject({ consentStatus: "pending", slug: clubB.slug });

            const confirmed = await lk(owner.cookies)
                .post(`/cabinet/memberships/${memberId}/confirm`)
                .send({});
            expect(confirmed.status).toBe(200);
            expect((await consentRow(memberId)).consentStatus).toBe("confirmed");
            expect((await lk(owner.cookies).get("/cabinet/members/me", clubB)).status).toBe(200);
        });

        it("TASK-701: the QR is issued on first request, a reissue kills the old code, the scanner says why", async () => {
            const owner = await memberWithSession("qr-owner");
            const added = await as(clubB)
                .post("/crm/members")
                .send({ email: owner.email, fields: { first_name: "Qr" } });
            const memberId = added.body.memberId as string;

            // Пока членство не подтверждено, клуб для аккаунта закрыт, в том числе QR
            expect((await lk(owner.cookies).get("/cabinet/qr-code", clubB)).status).toBe(403);
            expect(
                (await lk(owner.cookies).post(`/cabinet/memberships/${memberId}/confirm`).send({}))
                    .status
            ).toBe(200);

            const first = await lk(owner.cookies).get("/cabinet/qr-code", clubB);
            expect(first.status).toBe(200);
            const firstCode = first.body.encryptedCode as string;
            expect(
                (await as(clubB).post("/crm/qr-codes/scan").send({ encryptedCode: firstCode })).body
            ).toMatchObject({ valid: true, memberId });

            const again = await lk(owner.cookies).get("/cabinet/qr-code", clubB);
            expect(again.body.encryptedCode).toBe(firstCode);

            const reissued = await lk(owner.cookies)
                .post("/cabinet/qr-code/regenerate", clubB)
                .send({});
            expect(reissued.status).toBe(201);
            const newCode = reissued.body.encryptedCode as string;
            expect(newCode).not.toBe(firstCode);

            const stale = await as(clubB)
                .post("/crm/qr-codes/scan")
                .send({ encryptedCode: firstCode });
            expect(stale.body).toMatchObject({ valid: false, errorCode: "revoked" });
            const fresh = await as(clubB)
                .post("/crm/qr-codes/scan")
                .send({ encryptedCode: newCode });
            expect(fresh.body.valid).toBe(true);

            // Код другого клуба не принимается на стойке этого клуба
            const wrongClub = await as(clubA)
                .post("/crm/qr-codes/scan")
                .send({ encryptedCode: newCode });
            expect(wrongClub.body).toMatchObject({ valid: false, errorCode: "wrong_club" });

            // Предпросмотр и подтверждение отказывают кодом причины, а не русской строкой
            const preview = await as(clubA)
                .post("/crm/presence/qr-preview")
                .send({ encryptedCode: firstCode });
            expect(preview.body).toMatchObject({ valid: false, errorCode: expect.any(String) });

            const status = await lk(owner.cookies).get("/cabinet/presence/status", clubB);
            expect(status.status).toBe(200);
            expect(status.body).toEqual({ isPresent: false, currentSession: null });
        });

        /** Документ, записанный напрямую: загрузка файла упирается в живой S3. */
        const passportOf = (userId: string, label: string, extra: Record<string, unknown> = {}) =>
            prisma.userDocument.create({
                data: {
                    userId,
                    type: "passport",
                    side: "single",
                    number: `N-${label}`,
                    storagePath: `private/test/${suffix}/${label}.jpg`,
                    ...extra,
                },
            });

        it("TASK-704: joining a club shows no documents unless the owner picked them", async () => {
            // Заявка без ссылки — только в клуб, который их принимает (правила клуба, TASK-719)
            await prisma.clubPolicy.upsert({
                where: { portalId: await portalId(clubB) },
                create: { portalId: await portalId(clubB), joinPolicy: "approval" },
                update: { joinPolicy: "approval" },
            });
            const owner = await memberWithSession("share-join");
            const document = await passportOf(owner.userId, "share-join");
            const someoneElses = await passportOf(
                (await googleOnlyAccount("share-foreign")).userId,
                "share-foreign"
            );

            // Чужой документ в выборе: 400, и членство не появилось
            const rejected = await lk(owner.cookies)
                .post(`/cabinet/portals/${clubB.slug}/join`)
                .send({ fields: { first_name: "Join" }, shareDocumentIds: [someoneElses.id] });
            expect(rejected.status).toBe(400);
            expect(
                await prisma.member.count({
                    where: { userId: owner.userId, portalId: await portalId(clubB) },
                })
            ).toBe(0);

            // Без выбора клуб не видит ничего
            const joined = await lk(owner.cookies)
                .post(`/cabinet/portals/${clubB.slug}/join`)
                .send({ fields: { first_name: "Join" } });
            expect(joined.status).toBe(201);
            const memberId = joined.body.memberId as string;
            const hidden = await as(clubB).get(`/crm/members/${memberId}`);
            expect(hidden.body.documents).toEqual([]);

            // Владелец показывает документ из «Моего паспорта» — клуб его видит
            const shared = await lk(owner.cookies)
                .post(`/cabinet/account/documents/${document.id}/share`)
                .send({ memberId });
            expect(shared.status).toBe(204);
            const visible = await as(clubB).get(`/crm/members/${memberId}`);
            expect(visible.body.documents.map((d: { id: string }) => d.id)).toEqual([document.id]);

            // Список владельца говорит, какому клубу показан документ
            const list = await lk(owner.cookies).get("/cabinet/account/documents");
            const entry = (
                list.body.documents as { id: string; sharedWith: { slug: string }[] }[]
            ).find((d) => d.id === document.id);
            expect(entry?.sharedWith.map((club) => club.slug)).toEqual([clubB.slug]);

            // Отзыв закрывает клубу доступ
            const revoked = await lk(owner.cookies)
                .delete(`/cabinet/account/documents/${document.id}/share/${memberId}`)
                .send();
            expect(revoked.status).toBe(204);
            expect((await as(clubB).get(`/crm/members/${memberId}`)).body.documents).toEqual([]);

            // Журнал помнит и показ, и отзыв
            const actions = (
                await prisma.documentAccessLog.findMany({
                    where: { userId: owner.userId, documentId: document.id },
                    orderBy: { createdAt: "asc" },
                })
            ).map((row) => `${row.actorType}:${row.action}`);
            expect(actions).toEqual(["owner:share", "owner:revoke"]);
        });

        it("TASK-704: a club keeps seeing the version it was shown; unshared old versions are dropped", async () => {
            const owner = await memberWithSession("share-version");
            const v1 = await passportOf(owner.userId, "v1");
            const added = await as(clubA)
                .post("/crm/members")
                .send({ email: owner.email, fields: { first_name: "Version" } });
            const memberId = added.body.memberId as string;
            await lk(owner.cookies)
                .post(`/cabinet/memberships/${memberId}/confirm`)
                .send({
                    shareDocumentIds: [v1.id],
                });

            // Владелец загрузил новую версию: в базе она рядом, клуб A по-прежнему видит v1
            const v2 = await passportOf(owner.userId, "v2", { version: 2 });
            const cardA = await as(clubA).get(`/crm/members/${memberId}`);
            expect(cardA.body.documents.map((d: { id: string }) => d.id)).toEqual([v1.id]);

            // «Мой паспорт» показывает текущую версию v2, не показанную никому
            const list = await lk(owner.cookies).get("/cabinet/account/documents");
            const current = (list.body.documents as { id: string; sharedWith: unknown[] }[]).filter(
                (d) => [v1.id, v2.id].includes(d.id)
            );
            expect(current.map((d) => d.id)).toEqual([v2.id]);
            expect(current[0]?.sharedWith).toEqual([]);

            // Отозвали показ v1 — версия, которую никто не видит, удаляется
            const revoked = await lk(owner.cookies)
                .delete(`/cabinet/account/documents/${v1.id}/share/${memberId}`)
                .send();
            expect(revoked.status).toBe(204);
            expect(await prisma.userDocument.findUnique({ where: { id: v1.id } })).toBeNull();
            expect(await prisma.userDocument.findUnique({ where: { id: v2.id } })).not.toBeNull();
        });

        it("TASK-715: showing the new version replaces the old one for that club", async () => {
            const owner = await memberWithSession("share-replace");
            const v1 = await passportOf(owner.userId, "r1");
            const added = await as(clubA)
                .post("/crm/members")
                .send({ email: owner.email, fields: { first_name: "Replace" } });
            const memberId = added.body.memberId as string;
            await lk(owner.cookies)
                .post(`/cabinet/memberships/${memberId}/confirm`)
                .send({ shareDocumentIds: [v1.id] });
            const v2 = await passportOf(owner.userId, "r2", { version: 2 });

            type Listed = {
                id: string;
                sharedWith: { slug: string }[];
                staleSharedWith: { slug: string }[];
            };
            const listed = async () =>
                (
                    (await lk(owner.cookies).get("/cabinet/account/documents")).body as {
                        documents: Listed[];
                    }
                ).documents.find((d) => d.id === v2.id);

            // Клуб ещё видит прежний паспорт, и владелец об этом знает
            const before = await listed();
            expect(before?.sharedWith).toEqual([]);
            expect(before?.staleSharedWith.map((club) => club.slug)).toEqual([clubA.slug]);

            const shared = await lk(owner.cookies)
                .post(`/cabinet/account/documents/${v2.id}/share`)
                .send({ memberId });
            expect(shared.status).toBe(204);

            // Теперь клуб видит ровно новую версию, прежняя снята и удалена
            const card = await as(clubA).get(`/crm/members/${memberId}`);
            expect(card.body.documents.map((d: { id: string }) => d.id)).toEqual([v2.id]);
            expect(await prisma.userDocument.findUnique({ where: { id: v1.id } })).toBeNull();
            const after = await listed();
            expect(after?.sharedWith.map((club) => club.slug)).toEqual([clubA.slug]);
            expect(after?.staleSharedWith).toEqual([]);
        });

        it("TASK-704: the document number is stored encrypted and read back plain", async () => {
            const owner = await memberWithSession("share-number");
            const document = await passportOf(owner.userId, "number");

            const documents = app.get(UserDocumentRepository);
            expect(await documents.sealLegacyNumbers()).toBeGreaterThanOrEqual(1);
            const raw = await prisma.userDocument.findUniqueOrThrow({ where: { id: document.id } });
            expect(raw.number?.startsWith("enc1:")).toBe(true);
            expect(raw.number).not.toContain("N-number");

            const list = await lk(owner.cookies).get("/cabinet/account/documents");
            const entry = (list.body.documents as { id: string; number: string }[]).find(
                (d) => d.id === document.id
            );
            expect(entry?.number).toBe("N-number");

            // Повторное шифрование ничего не меняет
            expect(await documents.sealLegacyNumbers()).toBe(0);
        });

        it("TASK-704: only my own confirmed membership can be a target of a share", async () => {
            const owner = await memberWithSession("share-target");
            const stranger = await memberWithSession("share-target-stranger");
            const document = await passportOf(owner.userId, "target");
            const strangerClub = await as(clubB)
                .post("/crm/members")
                .send({ email: stranger.email, fields: { first_name: "Stranger" } });
            await lk(stranger.cookies)
                .post(`/cabinet/memberships/${strangerClub.body.memberId as string}/confirm`)
                .send({});

            const toForeignMembership = await lk(owner.cookies)
                .post(`/cabinet/account/documents/${document.id}/share`)
                .send({ memberId: strangerClub.body.memberId });
            expect(toForeignMembership.status).toBe(404);

            const foreignDocument = await lk(stranger.cookies)
                .post(`/cabinet/account/documents/${document.id}/share`)
                .send({ memberId: strangerClub.body.memberId });
            expect([403, 404]).toContain(foreignDocument.status);
            expect(
                await prisma.memberDocumentShare.count({ where: { userDocumentId: document.id } })
            ).toBe(0);
        });

        it("someone else's membership cannot be confirmed, declined or left", async () => {
            const owner = await memberWithSession("sess-owner");
            const intruder = await memberWithSession("sess-intruder");
            const created = await as(clubB)
                .post("/crm/members")
                .send({ email: owner.email, fields: { first_name: "Mine" } });
            const memberId = created.body.memberId as string;

            for (const action of ["confirm", "decline", "leave"]) {
                const res = await lk(intruder.cookies)
                    .post(`/cabinet/memberships/${memberId}/${action}`)
                    .send({});
                expect(res.status).toBe(404);
            }
            expect((await consentRow(memberId)).consentStatus).toBe("pending");
        });

        it("declining removes a pending membership; leaving closes a confirmed one and revokes the documents", async () => {
            const owner = await memberWithSession("sess-leave");
            const declinedBy = await as(clubB)
                .post("/crm/members")
                .send({ email: owner.email, fields: { first_name: "Decline" } });
            const declinedId = declinedBy.body.memberId as string;
            expect(
                (
                    await lk(owner.cookies)
                        .post(`/cabinet/memberships/${declinedId}/decline`)
                        .send({})
                ).status
            ).toBe(200);
            expect(await prisma.member.findUnique({ where: { id: declinedId } })).toBeNull();

            const document = await prisma.userDocument.create({
                data: {
                    userId: owner.userId,
                    type: "passport",
                    side: "single",
                    number: "X-LEAVE",
                    storagePath: `private/test/${suffix}/leave.jpg`,
                },
            });
            try {
                const added = await as(clubA)
                    .post("/crm/members")
                    .send({ email: owner.email, fields: { first_name: "Leave" } });
                const memberId = added.body.memberId as string;
                const confirmed = await lk(owner.cookies)
                    .post(`/cabinet/memberships/${memberId}/confirm`)
                    .send({ shareDocumentIds: [document.id] });
                expect(confirmed.status).toBe(200);
                expect(await prisma.memberDocumentShare.count({ where: { memberId } })).toBe(1);

                const left = await lk(owner.cookies)
                    .post(`/cabinet/memberships/${memberId}/leave`)
                    .send({});
                expect(left.status).toBe(200);
                expect((await consentRow(memberId)).isActive).toBe(false);
                expect(await prisma.memberDocumentShare.count({ where: { memberId } })).toBe(0);
                expect((await lk(owner.cookies).get("/cabinet/members/me", clubA)).status).toBe(
                    403
                );
            } finally {
                await prisma.userDocument.delete({ where: { id: document.id } });
            }
        });
    });

    describe("auth audit 2026-10-14", () => {
        /** Подтверждённый аккаунт участника с паролем — через ссылку-форму клуба A. */
        const confirmedMember = async (label: string) => {
            const email = `${label}-${suffix}@test.local`;
            const link = await as(clubA)
                .post("/crm/settings/registration-links")
                .send({ name: `audit-${label}`, kind: "public_link" });
            expect(link.status).toBe(201);
            const signUp = await request(app.getHttpServer())
                .post(`/public/reg-links/${link.body.token as string}/register`)
                .send({ email, password: PASSWORD, fields: { first_name: label } });
            expect(signUp.status).toBe(201);
            const { emailVerificationToken, id } = await prisma.user.findUniqueOrThrow({
                where: { email },
            });
            const confirmed = await request(app.getHttpServer())
                .post("/cabinet/auth/member/confirm-email")
                .send({ token: emailVerificationToken });
            expect([200, 201]).toContain(confirmed.status);
            return { email, userId: id };
        };

        it("accepting an invitation with the account password signs in through cookies only", async () => {
            const user = await confirmedMember("invitee");
            const invitation = await as(clubB)
                .post("/crm/settings/invitations")
                .send({ email: user.email, role: "employee" });
            expect(invitation.status).toBe(201);

            const accepted = await request(app.getHttpServer())
                .post(`/public/invitations/${invitation.body.token as string}/accept`)
                .send({ password: PASSWORD });
            expect(accepted.status).toBe(200);
            expect(accepted.body.outcome).toBe("accepted");
            expect(accepted.body).not.toHaveProperty("accessToken");
            expect(accepted.body).not.toHaveProperty("refreshToken");

            const cookies = cookieHeader(accepted);
            expect(cookies).toContain("crm_access_token=");
            const me = await request(app.getHttpServer())
                .get("/crm/auth/me")
                .set("Cookie", cookies);
            expect(me.status).toBe(200);
            expect(me.body.email).toBe(user.email);
        });

        it("refresh tokens are stored hashed and one device keeps one row", async () => {
            const user = await confirmedMember("hashed");
            const login = () =>
                request(app.getHttpServer())
                    .post("/cabinet/auth/login")
                    .set("X-Device-Id", `audit-device-${suffix}`)
                    .send({ email: user.email, password: PASSWORD });

            const first = await login();
            expect(first.status).toBe(201);
            const rawRefresh = cookieHeader(first)
                .split("; ")
                .find((c) => c.startsWith("member_refresh_token="))
                ?.split("=")[1];
            expect(rawRefresh).toBeTruthy();

            // Сырой токен в БД не лежит (TASK-668) — только его хеш
            expect(
                await prisma.refreshToken.findFirst({
                    where: { token: decodeURIComponent(rawRefresh as string) },
                })
            ).toBeNull();
            expect(await prisma.refreshToken.count({ where: { userId: user.userId } })).toBe(1);

            // Повторный вход с того же устройства не плодит строк
            expect((await login()).status).toBe(201);
            expect(await prisma.refreshToken.count({ where: { userId: user.userId } })).toBe(1);

            // Кука при этом рабочая
            const refreshed = await request(app.getHttpServer())
                .post("/cabinet/auth/refresh")
                .set("Cookie", cookieHeader(await login()));
            expect(refreshed.status).toBe(201);
        });

        it("a blocked account cannot sign in or recover through old links", async () => {
            const user = await confirmedMember("blocked");
            await prisma.user.update({
                where: { id: user.userId },
                data: { status: "blocked" },
            });

            const login = await request(app.getHttpServer())
                .post("/cabinet/auth/login")
                .send({ email: user.email, password: PASSWORD });
            expect(login.status).toBe(401);
            expect(login.body.message).toBe("Account is blocked");

            // Сброс пароля отвечает как обычно, но токен не выписывает
            const reset = await request(app.getHttpServer())
                .post("/cabinet/auth/password/reset")
                .send({ email: user.email });
            expect(reset.status).toBe(201);
            const after = await prisma.user.findUniqueOrThrow({ where: { id: user.userId } });
            expect(after.resetPasswordToken).toBeNull();
        });

        it("the public resend endpoint answers the same for known and unknown emails", async () => {
            const email = `resend-${suffix}@test.local`;
            const link = await as(clubA)
                .post("/crm/settings/registration-links")
                .send({ name: "audit-resend", kind: "public_link" });
            const signUp = await request(app.getHttpServer())
                .post(`/public/reg-links/${link.body.token as string}/register`)
                .send({ email, password: PASSWORD, fields: { first_name: "Resend" } });
            expect(signUp.status).toBe(201);
            await prisma.user.update({
                where: { email },
                data: { emailVerificationToken: null, emailVerificationExpiresAt: null },
            });

            const resend = (target: string) =>
                request(app.getHttpServer())
                    .post("/cabinet/auth/member/confirm-email/resend")
                    .send({ email: target });

            const known = await resend(email);
            const unknown = await resend(`ghost-${suffix}@test.local`);
            expect(known.status).toBe(201);
            expect(unknown.status).toBe(201);
            expect(known.body).toEqual(unknown.body);

            const { emailVerificationToken } = await prisma.user.findUniqueOrThrow({
                where: { email },
            });
            expect(emailVerificationToken).toBeTruthy();
        });

        it("resolve endpoint answers 400/404 instead of 500", async () => {
            const missingSlug = await request(app.getHttpServer()).get("/crm/portals/resolve");
            expect(missingSlug.status).toBe(400);
            const unknown = await request(app.getHttpServer()).get(
                `/crm/portals/resolve?slug=ghost-${suffix}`
            );
            expect(unknown.status).toBe(404);
        });
    });
});
