import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import cookieParser from "cookie-parser";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";
import { REFRESH_REUSE_GRACE_MS } from "../src/modules/portal/auth/sessions/domain/auth-session";

import { cabinetSession, crmSession, startTestSession } from "./support/sessions";

jest.setTimeout(120_000);

const suffix = Date.now().toString(36);
const PASSWORD = "Password123";

const setCookies = (res: request.Response): string[] => {
    const raw = res.headers["set-cookie"];
    return Array.isArray(raw) ? raw : raw ? [raw] : [];
};
const cookieHeader = (res: request.Response): string =>
    setCookies(res)
        .map((c) => c.split(";")[0])
        .join("; ");
const cookieAttributes = (res: request.Response, name: string): string =>
    setCookies(res).find((c) => c.startsWith(`${name}=`)) ?? "";

/**
 * Сессии (AUTH_ARCHITECTURE §3): вход после регистрации, ротация refresh, гонка вкладок, повтор
 * украденного токена, мгновенный отзыв и разделение аудиторий.
 */
describe("Auth sessions (e2e)", () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let ownerId: string;

    const slug = `sessions-${suffix}`;
    const email = `owner-${slug}@test.local`;

    const http = () => request(app.getHttpServer());
    const login = () => http().post("/crm/auth/login").send({ email, password: PASSWORD });
    const refresh = (cookies: string) => http().post("/crm/auth/refresh").set("Cookie", cookies);
    const me = (cookies: string) => http().get("/crm/auth/me").set("Cookie", cookies);

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.use(cookieParser());
        await app.init();

        prisma = app.get(PrismaService);

        const res = await http()
            .post("/platform/portals/register")
            .send({
                name: slug,
                displayName: `Sessions ${suffix}`,
                email,
                password: PASSWORD,
                ownerName: "Owner",
                acceptTerms: true,
            });
        expect(res.status).toBe(201);
        expect(await me(cookieHeader(res)).then((r) => r.status)).toBe(200);
        ownerId = (await prisma.user.findUniqueOrThrow({ where: { email } })).id;
    });

    afterAll(async () => {
        await prisma.portal.deleteMany({ where: { name: slug } });
        await prisma.user.deleteMany({ where: { email } });
        await app.close();
    });

    it("sets host-only token cookies, the refresh one only on the auth path", async () => {
        const res = await login();
        expect(res.status).toBe(201);
        const access = cookieAttributes(res, "crm_access");
        const refreshCookie = cookieAttributes(res, "crm_refresh");
        expect(access).toMatch(/HttpOnly/i);
        expect(access).not.toMatch(/Domain=/i);
        expect(refreshCookie).toMatch(/Path=\/crm\/auth/i);
        expect(refreshCookie).not.toMatch(/Domain=/i);
        expect(cookieAttributes(res, "crm_session")).toContain("crm_session=1");
        expect(res.body).not.toHaveProperty("accessToken");
    });

    it("logs in twice within the same second", async () => {
        const [first, second] = await Promise.all([login(), login()]);

        expect(first.status).toBe(201);
        expect(second.status).toBe(201);
        expect(cookieHeader(first)).not.toBe(cookieHeader(second));
    });

    it("rotates the refresh token; the previous one right after is a tab race, not a theft", async () => {
        const issued = cookieHeader(await login());

        const refreshed = await refresh(issued);
        expect(refreshed.status).toBe(201);
        expect(cookieHeader(refreshed)).not.toBe(issued);

        const raced = await refresh(issued);
        expect(raced.status).toBe(401);
        expect(raced.body.code).toBe("refresh_superseded");
        // гонка вкладок куки не стирает и сессию не гасит
        expect(setCookies(raced)).toHaveLength(0);
        expect((await refresh(cookieHeader(refreshed))).status).toBe(201);
    });

    it("lets only one of two concurrent refreshes with the same token through", async () => {
        const issued = cookieHeader(await login());

        const responses = await Promise.all([refresh(issued), refresh(issued)]);
        const statuses = responses.map((r) => r.status).sort();

        expect(statuses).toEqual([201, 401]);
        expect(responses.find((r) => r.status === 401)?.body.code).toBe("refresh_superseded");
    });

    it("many tabs refreshing at once: one new pair of cookies, the rest wait and reuse it", async () => {
        const TABS = 8;
        const issued = cookieHeader(await login());

        const responses = await Promise.all(Array.from({ length: TABS }, () => refresh(issued)));
        const winners = responses.filter((r) => r.status === 201);
        const losers = responses.filter((r) => r.status === 401);

        expect(winners).toHaveLength(1);
        expect(losers).toHaveLength(TABS - 1);
        for (const loser of losers) {
            expect(loser.body.code).toBe("refresh_superseded");
            // the losing tabs keep their cookies: the browser already holds the winner's pair
            expect(setCookies(loser)).toHaveLength(0);
        }
        // every tab then speaks with the single new pair from the shared cookie jar
        const next = cookieHeader(winners[0]);
        expect((await me(next)).status).toBe(200);
        expect((await refresh(next)).status).toBe(201);
        const row = await prisma.authSession.findFirst({
            where: { userId: ownerId, revokedAt: { not: null } },
        });
        expect(row).toBeNull();
    });

    it("a refresh token replayed after the grace window ends the whole session", async () => {
        const session = await crmSession(app, ownerId);
        const rotated = await refresh(session.refreshCookie);
        expect(rotated.status).toBe(201);

        await prisma.authSession.update({
            where: { id: session.sessionId },
            data: { rotatedAt: new Date(Date.now() - REFRESH_REUSE_GRACE_MS - 1_000) },
        });

        const replayed = await refresh(session.refreshCookie);
        expect(replayed.status).toBe(401);
        expect(replayed.body.code).toBe("session_ended");
        expect((await refresh(cookieHeader(rotated))).status).toBe(401);
        expect((await me(cookieHeader(rotated))).status).toBe(401);
        const row = await prisma.authSession.findUniqueOrThrow({
            where: { id: session.sessionId },
        });
        expect(row.revokeReason).toBe("reuse_detected");
    });

    it("logout revokes the access token at once, not when it expires", async () => {
        const session = await crmSession(app, ownerId);
        expect((await me(session.cookies)).status).toBe(200);

        const out = await http()
            .post("/crm/auth/logout")
            .set("Cookie", `${session.cookies}; ${session.refreshCookie}`);
        expect([200, 201, 204]).toContain(out.status);

        expect((await me(session.cookies)).status).toBe(401);
        expect((await refresh(session.refreshCookie)).status).toBe(401);
    });

    it("blocking the account stops its open sessions", async () => {
        const session = await crmSession(app, ownerId);
        await prisma.user.update({ where: { id: ownerId }, data: { status: "blocked" } });
        try {
            expect((await me(session.cookies)).status).toBe(401);
            expect((await refresh(session.refreshCookie)).status).toBe(401);
        } finally {
            await prisma.user.update({ where: { id: ownerId }, data: { status: "active" } });
        }
    });

    it("a CRM session is not a cabinet session, cookie or Bearer", async () => {
        const session = await crmSession(app, ownerId);

        const asCookie = await http()
            .get("/cabinet/auth/me")
            .set("Cookie", `cabinet_access=${session.accessToken}`);
        expect(asCookie.status).toBe(401);

        const asBearer = await http()
            .get("/cabinet/auth/me")
            .set("Authorization", `Bearer ${session.accessToken}`);
        expect(asBearer.status).toBe(401);

        const refreshAsAccess = await http()
            .get("/crm/auth/me")
            .set("Authorization", `Bearer ${session.refreshToken}`);
        expect(refreshAsAccess.status).toBe(401);
    });
    it("devices: the account sees its sessions of both apps and closes another one", async () => {
        const here = await crmSession(app, ownerId);
        const phone = await crmSession(app, ownerId);
        const cabinet = await startTestSession(app, ownerId, "cabinet");
        const devices = () => http().get("/crm/account/sessions").set("Cookie", here.cookies);

        const listed = await devices();
        expect(listed.status).toBe(200);
        const rows = listed.body.sessions as { id: string; audience: string; current: boolean }[];
        expect(rows.find((row) => row.current)?.id).toBe(here.sessionId);
        expect(rows.map((row) => row.id)).toEqual(
            expect.arrayContaining([phone.sessionId, cabinet.sessionId])
        );
        expect(rows.find((row) => row.id === cabinet.sessionId)?.audience).toBe("cabinet");

        const current = await http()
            .delete(`/crm/account/sessions/${here.sessionId}`)
            .set("Cookie", here.cookies);
        expect(current.status).toBe(409);
        expect(current.body.code).toBe("current_session");

        const closed = await http()
            .delete(`/crm/account/sessions/${phone.sessionId}`)
            .set("Cookie", here.cookies);
        expect(closed.status).toBe(204);
        expect((await me(phone.cookies)).status).toBe(401);

        const again = await http()
            .delete(`/crm/account/sessions/${phone.sessionId}`)
            .set("Cookie", here.cookies);
        expect(again.status).toBe(404);

        const others = await http()
            .post("/crm/account/sessions/sign-out-others")
            .set("Cookie", here.cookies);
        expect(others.status).toBe(200);
        expect(others.body.ended).toBeGreaterThanOrEqual(1);
        expect((await http().get("/cabinet/auth/me").set("Cookie", cabinet.cookies)).status).toBe(
            401
        );
        expect((await me(here.cookies)).status).toBe(200);
    });

    it("devices: a session of another account cannot be closed", async () => {
        const stranger = await prisma.user.create({
            data: { email: `stranger-${slug}@test.local`, isActive: true, emailConfirmed: true },
        });
        try {
            const theirs = await cabinetSession(app, stranger.id);
            const mine = await crmSession(app, ownerId);
            const res = await http()
                .delete(`/crm/account/sessions/${theirs.sessionId}`)
                .set("Cookie", mine.cookies);
            expect(res.status).toBe(404);
            expect(
                (await http().get("/cabinet/auth/me").set("Cookie", theirs.cookies)).status
            ).toBe(200);
        } finally {
            await prisma.user.delete({ where: { id: stranger.id } });
        }
    });
});
