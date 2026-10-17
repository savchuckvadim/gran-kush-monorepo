import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import * as bcrypt from "bcrypt";
import cookieParser from "cookie-parser";
import { createHash, createHmac } from "crypto";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";
import { MailService } from "../src/modules/mail/application/services/mail.service";

import { cabinetSession } from "./support/sessions";

jest.setTimeout(120_000);

const suffix = Date.now().toString(36);
const PASSWORD = "Password123";
const BOT_TOKEN = "123456:test-bot-token";
const BOT_USERNAME = "pafpaf_test_bot";
/** id Telegram уникальные на прогон и одинаковые внутри него: привязки живут в общей таблице */
const RUN = Date.now() % 1_000_000_000;
const tgId = (n: number) => Number(`${RUN}${n}`);

const setCookies = (res: request.Response): string[] => {
    const raw = res.headers["set-cookie"];
    return Array.isArray(raw) ? raw : raw ? [raw] : [];
};

/** Ответ виджета, подписанный ключом бота по правилу Telegram. */
const widget = (id: number, extra: Record<string, string | number> = {}) => {
    const fields: Record<string, string | number> = {
        id,
        first_name: "Tele",
        username: `tg_${id}`,
        auth_date: Math.floor(Date.now() / 1000),
        ...extra,
    };
    const check = Object.entries(fields)
        .map(([key, value]) => `${key}=${value}`)
        .sort()
        .join("\n");
    const secret = createHash("sha256").update(BOT_TOKEN).digest();
    return { ...fields, hash: createHmac("sha256", secret).update(check).digest("hex") };
};

/**
 * Вход через Telegram (вариант с почтой): привязанный Telegram входит сразу, новый — через шаг
 * «укажите почту» и ссылку из письма; привязка из настроек и правило последнего способа входа.
 * Бот подменён тестовым токеном, письма перехватываются.
 */
describe("Telegram sign-in (e2e)", () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let lastLink = "";
    const saved = {
        token: process.env.TG_CLIENT_BOT_API_KEY,
        username: process.env.TG_CLIENT_BOT_USERNAME,
    };

    const post = (url: string, body: object, cookies?: string) => {
        const req = request(app.getHttpServer()).post(url).send(body);
        return cookies ? req.set("Cookie", cookies) : req;
    };

    /** Новый Telegram: билет, письмо, ссылка — и вход */
    const signUp = async (id: number, email: string) => {
        const first = await post("/cabinet/auth/telegram", widget(id));
        expect(first.body).toMatchObject({ status: "email_required" });
        const sent = await post("/cabinet/auth/telegram/email", {
            ticket: first.body.ticket,
            email,
        });
        expect(sent.body).toEqual({ status: "email_sent" });
        return lastLink;
    };

    beforeAll(async () => {
        process.env.TG_CLIENT_BOT_API_KEY = BOT_TOKEN;
        process.env.TG_CLIENT_BOT_USERNAME = BOT_USERNAME;
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        app.use(cookieParser());
        await app.init();
        prisma = app.get(PrismaService);
        jest.spyOn(app.get(MailService), "sendTelegramEmailLink").mockImplementation(
            async ({ token }) => {
                lastLink = token;
                return true;
            }
        );
    });

    afterAll(async () => {
        await prisma.user.deleteMany({ where: { email: { endsWith: `${suffix}@test.local` } } });
        await app.close();
        process.env.TG_CLIENT_BOT_API_KEY = saved.token;
        process.env.TG_CLIENT_BOT_USERNAME = saved.username;
    });

    it("the widget is offered when the bot is configured", async () => {
        const res = await request(app.getHttpServer()).get("/cabinet/auth/telegram/config");
        expect(res.body).toEqual({ enabled: true, botUsername: BOT_USERNAME, botId: 123456 });
    });

    it("a forged or stale widget answer is refused", async () => {
        const forged = { ...widget(tgId(1)), first_name: "Someone else" };
        const res = await post("/cabinet/auth/telegram", forged);
        expect(res.status).toBe(400);
        expect(res.body.code).toBe("telegram_signature");

        const stale = widget(tgId(1), { auth_date: Math.floor(Date.now() / 1000) - 2 * 3600 });
        expect((await post("/cabinet/auth/telegram", stale)).body.code).toBe("telegram_signature");
    });

    it("a new Telegram signs up through the email link, then signs in directly", async () => {
        const id = tgId(2);
        const email = `tg-new-${suffix}@test.local`;
        const link = await signUp(id, email);

        // the ticket is not a link and the link is not a ticket
        expect((await post("/cabinet/auth/telegram/confirm", { token: "nope" })).body.code).toBe(
            "telegram_link"
        );

        const confirmed = await post("/cabinet/auth/telegram/confirm", { token: link });
        expect(confirmed.body).toEqual({ status: "signed_in" });
        expect(setCookies(confirmed).some((c) => c.startsWith("cabinet_access="))).toBe(true);
        const user = await prisma.user.findUniqueOrThrow({ where: { email } });
        expect(user).toMatchObject({ emailConfirmed: true, isActive: true, passwordHash: null });

        const again = await post("/cabinet/auth/telegram", widget(id));
        expect(again.body).toEqual({ status: "signed_in" });
    });

    it("an existing account gets Telegram linked once its owner opens the link", async () => {
        const email = `tg-existing-${suffix}@test.local`;
        const existing = await prisma.user.create({
            data: {
                email,
                passwordHash: await bcrypt.hash(PASSWORD, 4),
                status: "active",
                isActive: true,
                emailConfirmed: true,
            },
        });
        const link = await signUp(tgId(3), email);
        const confirmed = await post("/cabinet/auth/telegram/confirm", { token: link });
        expect(confirmed.status).toBe(200);

        const identity = await prisma.userIdentity.findFirstOrThrow({
            where: { provider: "telegram", providerUserId: String(tgId(3)) },
        });
        expect(identity.userId).toBe(existing.id);
        const after = await prisma.user.findUniqueOrThrow({ where: { id: existing.id } });
        expect(after.passwordHash).toBe(existing.passwordHash);
    });

    it("a Telegram linked to another account meanwhile is not moved by an old link", async () => {
        const id = tgId(4);
        const link = await signUp(id, `tg-late-${suffix}@test.local`);

        const owner = await prisma.user.create({
            data: {
                email: `tg-owner-${suffix}@test.local`,
                passwordHash: await bcrypt.hash(PASSWORD, 4),
                status: "active",
                isActive: true,
                emailConfirmed: true,
            },
        });
        const tokens = await cabinetSession(app, owner.id, `device-${suffix}`);
        const cookies = tokens.cookies;
        const linked = await post("/cabinet/account/security/telegram", widget(id), cookies);
        expect(linked.status).toBe(200);
        expect(linked.body.telegram).toEqual({ linked: true, username: `tg_${id}` });

        const late = await post("/cabinet/auth/telegram/confirm", { token: link });
        expect(late.status).toBe(409);
        expect(late.body.code).toBe("telegram_taken");
    });

    it("the last way to sign in can not be removed", async () => {
        const id = tgId(5);
        const link = await signUp(id, `tg-only-${suffix}@test.local`);
        const confirmed = await post("/cabinet/auth/telegram/confirm", { token: link });
        const access = setCookies(confirmed)
            .find((c) => c.startsWith("cabinet_access="))
            ?.split(";")[0];

        const refused = await request(app.getHttpServer())
            .delete("/cabinet/account/security/telegram")
            .set("Cookie", access ?? "");
        expect(refused.status).toBe(409);
        expect(refused.body.code).toBe("last_sign_in_method");
    });
});
