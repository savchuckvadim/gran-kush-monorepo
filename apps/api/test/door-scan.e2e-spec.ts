import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import * as bcrypt from "bcrypt";
import cookieParser from "cookie-parser";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";
import { MemberAuthService } from "../src/modules/portal/auth/members/application/services/member-auth.service";

jest.setTimeout(120_000);

const suffix = Date.now().toString(36);
const PASSWORD = "Password123";

const cookieHeader = (res: request.Response): string => {
    const raw = res.headers["set-cookie"];
    const cookies: string[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return cookies.map((c) => c.split(";")[0]).join("; ");
};

/**
 * Стойка клуба (TASK-714): предпросмотр QR, подтверждение входа и выхода с явным действием,
 * повторы, перевыпуск кода и код чужого клуба.
 */
describe("Door scan (e2e)", () => {
    let app: INestApplication;
    let prisma: PrismaService;
    const clubs = [`door-a-${suffix}`, `door-b-${suffix}`];
    const owners = new Map<string, string>();
    /** memberId участника в каждом клубе */
    const memberIds = new Map<string, string>();
    let memberCookies: string;

    const crm = (slug: string) => ({
        get: (url: string) =>
            request(app.getHttpServer())
                .get(url)
                .set("Cookie", owners.get(slug) ?? "")
                .set("X-Portal-Slug", slug),
        delete: (url: string) =>
            request(app.getHttpServer())
                .delete(url)
                .set("Cookie", owners.get(slug) ?? "")
                .set("X-Portal-Slug", slug),
        post: (url: string, idempotencyKey?: string) => {
            const req = request(app.getHttpServer())
                .post(url)
                .set("Cookie", owners.get(slug) ?? "")
                .set("X-Portal-Slug", slug);
            return idempotencyKey ? req.set("Idempotency-Key", idempotencyKey) : req;
        },
    });

    const cabinet = (slug: string) => ({
        get: (url: string) =>
            request(app.getHttpServer())
                .get(url)
                .set("Cookie", memberCookies)
                .set("X-Portal-Slug", slug),
        post: (url: string) =>
            request(app.getHttpServer())
                .post(url)
                .set("Cookie", memberCookies)
                .set("X-Portal-Slug", slug),
    });

    const qrOf = async (slug: string): Promise<string> => {
        const res = await cabinet(slug).get("/cabinet/qr-code");
        expect(res.status).toBe(200);
        return res.body.encryptedCode as string;
    };

    const scan = (slug: string, encryptedCode: string, action: "entry" | "exit", key?: string) =>
        crm(slug).post("/crm/presence/qr-scan", key).send({ encryptedCode, action });

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        app.use(cookieParser());
        await app.init();
        prisma = app.get(PrismaService);

        for (const slug of clubs) {
            const res = await request(app.getHttpServer())
                .post("/platform/portals/register")
                .send({
                    name: slug,
                    displayName: `Door ${slug}`,
                    email: `owner-${slug}@test.local`,
                    password: PASSWORD,
                    ownerName: "Owner",
                    acceptTerms: true,
                });
            expect(res.status).toBe(201);
            owners.set(slug, cookieHeader(res));
            await request(app.getHttpServer())
                .patch("/crm/settings/club-policy")
                .set("Cookie", owners.get(slug) ?? "")
                .set("X-Portal-Slug", slug)
                .send({ joinPolicy: "approval" })
                .expect(200);
        }

        const email = `door-member-${suffix}@test.local`;
        const user = await prisma.user.create({
            data: {
                email,
                passwordHash: await bcrypt.hash(PASSWORD, 4),
                status: "active",
                isActive: true,
                emailConfirmed: true,
            },
        });
        const tokens = await app
            .get(MemberAuthService)
            .generateTokens({ id: user.id, email }, `device-${suffix}`);
        memberCookies = `member_access_token=${tokens.accessToken}`;
        for (const slug of clubs) {
            const joined = await request(app.getHttpServer())
                .post(`/cabinet/portals/${slug}/join`)
                .set("Cookie", memberCookies)
                .send({ fields: { first_name: "Door" } })
                .expect(201);
            memberIds.set(slug, joined.body.memberId as string);
        }
    });

    afterAll(async () => {
        await prisma.portal.deleteMany({ where: { name: { in: clubs } } });
        await prisma.user.deleteMany({ where: { email: { endsWith: `${suffix}@test.local` } } });
        await app.close();
    });

    it("preview proposes entry, the confirmed entry opens a visit, a second entry repeats it", async () => {
        const [club] = clubs as [string, string];
        const code = await qrOf(club);

        const preview = await crm(club)
            .post("/crm/presence/qr-preview")
            .send({ encryptedCode: code });
        expect(preview.body).toMatchObject({
            valid: true,
            isPresent: false,
            proposedAction: "entry",
        });

        const entry = await scan(club, code, "entry");
        expect(entry.status).toBe(201);
        expect(entry.body).toMatchObject({ action: "entry", repeated: false });

        // второй сотрудник подтверждает тот же вход: выхода не происходит
        const again = await scan(club, code, "entry");
        expect(again.body).toMatchObject({ action: "entry", repeated: true });
        expect(again.body.session.id).toBe(entry.body.session.id);
        expect((await cabinet(club).get("/cabinet/presence/status")).body.isPresent).toBe(true);
    });

    it("exit closes the visit once; the same key replays the answer, another key gets 409", async () => {
        const [club] = clubs as [string, string];
        const code = await qrOf(club);
        const preview = await crm(club)
            .post("/crm/presence/qr-preview")
            .send({ encryptedCode: code });
        expect(preview.body.proposedAction).toBe("exit");

        const key = `exit-${suffix}`;
        const exit = await scan(club, code, "exit", key);
        expect(exit.status).toBe(201);
        expect(exit.body.session.exitedAt).toEqual(expect.any(String));

        const replay = await scan(club, code, "exit", key);
        expect(replay.status).toBe(201);
        expect(replay.body.session.id).toBe(exit.body.session.id);

        const another = await scan(club, code, "exit");
        expect(another.status).toBe(409);
        expect(another.body.code).toBe("not_present");
        expect((await cabinet(club).get("/cabinet/presence/status")).body.isPresent).toBe(false);
    });

    it("a reissued QR replaces the old one", async () => {
        const [club] = clubs as [string, string];
        const old = await qrOf(club);
        const fresh = await cabinet(club).post("/cabinet/qr-code/regenerate");
        expect(fresh.status).toBe(201);

        const stale = await crm(club).post("/crm/presence/qr-preview").send({ encryptedCode: old });
        expect(stale.body).toMatchObject({ valid: false, errorCode: "revoked" });
        const refused = await scan(club, old, "entry");
        expect(refused.status).toBe(400);
        expect(refused.body.errors).toEqual(["revoked"]);
    });

    it("staff sees the code to print it; revoking kills it and the cabinet issues a new one", async () => {
        const [club] = clubs as [string, string];
        const memberId = memberIds.get(club) ?? "";
        const current = await qrOf(club);

        const staffView = await crm(club).get(`/crm/qr-codes/member/${memberId}`);
        expect(staffView.status).toBe(200);
        expect(staffView.body.encryptedCode).toBe(current);

        await crm(club).delete(`/crm/qr-codes/member/${memberId}`).expect(200);
        const revoked = await crm(club)
            .post("/crm/presence/qr-preview")
            .send({ encryptedCode: current });
        expect(revoked.body).toMatchObject({ valid: false, errorCode: "revoked" });
        expect((await crm(club).get(`/crm/qr-codes/member/${memberId}`)).status).toBe(404);

        const fresh = await qrOf(club);
        expect(fresh).not.toBe(current);
        const preview = await crm(club)
            .post("/crm/presence/qr-preview")
            .send({ encryptedCode: fresh });
        expect(preview.body.valid).toBe(true);
    });

    it("the QR of one club does not open the door of another", async () => {
        const [clubA, clubB] = clubs as [string, string];
        const codeOfB = await qrOf(clubB);
        const preview = await crm(clubA)
            .post("/crm/presence/qr-preview")
            .send({ encryptedCode: codeOfB });
        expect(preview.body).toMatchObject({ valid: false, errorCode: "wrong_club" });
    });
});
