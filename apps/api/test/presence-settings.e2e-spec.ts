import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import * as bcrypt from "bcrypt";
import cookieParser from "cookie-parser";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";
import { MemberAuthService } from "../src/modules/portal/auth/members/application/services/member-auth.service";
import { PresenceSettingsService } from "../src/modules/portal/crm/presence/application/services/presence-settings.service";

jest.setTimeout(120_000);

const suffix = Date.now().toString(36);
const PASSWORD = "Password123";

const cookieHeader = (res: request.Response): string => {
    const raw = res.headers["set-cookie"];
    const cookies: string[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return cookies.map((c) => c.split(";")[0]).join("; ");
};

const at = (iso: string): Date => new Date(iso);

/**
 * Правила присутствия клуба (TASK-714): настройки и авто-выход забытых визитов по часовому
 * поясу и потолку длительности. Визиты — в 2020 году: «сейчас» для авто-выхода задаётся
 * явно, и живые визиты dev-базы под правило не попадают.
 */
describe("Presence settings (e2e)", () => {
    let app: INestApplication;
    let prisma: PrismaService;
    const clubs = [`pres-a-${suffix}`, `pres-b-${suffix}`] as const;
    const owners = new Map<string, string>();
    /** entityRecordId участников по клубам: [клуб][номер участника] */
    const members = new Map<string, string[]>();

    const crm = (slug: string) => ({
        get: (url: string) =>
            request(app.getHttpServer())
                .get(url)
                .set("Cookie", owners.get(slug) ?? "")
                .set("X-Portal-Slug", slug),
        patch: (url: string) =>
            request(app.getHttpServer())
                .patch(url)
                .set("Cookie", owners.get(slug) ?? "")
                .set("X-Portal-Slug", slug),
    });

    const openVisit = (slug: string, memberIndex: number, enteredAt: string) => {
        const entityRecordId = members.get(slug)?.[memberIndex] ?? "";
        return prisma.presenceSession.create({
            data: {
                entityRecordId,
                activeEntityRecordId: entityRecordId,
                enteredAt: at(enteredAt),
                entryMethod: "manual",
            },
        });
    };

    const visit = (id: string) => prisma.presenceSession.findUniqueOrThrow({ where: { id } });

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
                    displayName: `Presence ${slug}`,
                    email: `owner-${slug}@test.local`,
                    password: PASSWORD,
                    ownerName: "Owner",
                    acceptTerms: true,
                });
            expect(res.status).toBe(201);
            owners.set(slug, cookieHeader(res));
            members.set(slug, []);
            await crm(slug)
                .patch("/crm/settings/club-policy")
                .send({ joinPolicy: "approval" })
                .expect(200);
        }

        for (let i = 0; i < 3; i++) {
            const email = `pres-member-${i}-${suffix}@test.local`;
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
                .generateTokens({ id: user.id, email }, `device-${i}-${suffix}`);
            for (const slug of clubs) {
                const joined = await request(app.getHttpServer())
                    .post(`/cabinet/portals/${slug}/join`)
                    .set("Cookie", `member_access_token=${tokens.accessToken}`)
                    .send({ fields: { first_name: `Member ${i}` } })
                    .expect(201);
                const member = await prisma.member.findUniqueOrThrow({
                    where: { id: joined.body.memberId as string },
                    select: { entityRecordId: true },
                });
                members.get(slug)?.push(member.entityRecordId);
            }
        }
    });

    afterAll(async () => {
        await prisma.portal.deleteMany({ where: { name: { in: [...clubs] } } });
        await prisma.user.deleteMany({ where: { email: { endsWith: `${suffix}@test.local` } } });
        await app.close();
    });

    it("a club that configured nothing gets the defaults", async () => {
        const res = await crm(clubs[0]).get("/crm/settings/presence");
        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            timezone: "Europe/Madrid",
            autoExitTime: "03:00",
            maxSessionHours: null,
        });
    });

    it.each([
        [{ timezone: "Mars/Olympus" }],
        [{ autoExitTime: "25:00" }],
        [{ autoExitTime: "3:00" }],
        [{ maxSessionHours: 0 }],
        [{ maxSessionHours: 49 }],
        [{ maxSessionHours: 2.5 }],
        [{ unknown: true }],
    ])("rejects %j", async (body) => {
        const res = await crm(clubs[0]).patch("/crm/settings/presence").send(body);
        expect(res.status).toBe(400);
    });

    it("saves only the named fields; null removes the cap", async () => {
        const [club] = clubs;
        const saved = await crm(club)
            .patch("/crm/settings/presence")
            .send({ timezone: "Asia/Tokyo", maxSessionHours: 6 });
        expect(saved.status).toBe(200);
        expect(saved.body).toEqual({
            timezone: "Asia/Tokyo",
            autoExitTime: "03:00",
            maxSessionHours: 6,
        });

        const patched = await crm(club)
            .patch("/crm/settings/presence")
            .send({ autoExitTime: "05:00", maxSessionHours: null });
        expect(patched.body).toEqual({
            timezone: "Asia/Tokyo",
            autoExitTime: "05:00",
            maxSessionHours: null,
        });
        expect((await crm(club).get("/crm/settings/presence")).body).toEqual(patched.body);
    });

    it("closes forgotten visits by each club's own clock and cap", async () => {
        const [tokyo, madrid] = clubs;
        // Клуб A — Токио (UTC+9), авто-выход 05:00 (настроено выше).
        // Клуб B — Мадрид по умолчанию (в марте 2020 ещё UTC+1), 03:00, потолок 2 часа.
        await crm(madrid).patch("/crm/settings/presence").send({ maxSessionHours: 2 }).expect(200);

        const tokyoBefore = await openVisit(tokyo, 0, "2020-03-10T12:00:00Z"); // 21:00 по Токио
        const tokyoAfter = await openVisit(tokyo, 1, "2020-03-10T20:30:00Z"); // 05:30 по Токио
        const madridCapped = await openVisit(madrid, 0, "2020-03-10T18:00:00Z");
        const madridFresh = await openVisit(madrid, 1, "2020-03-10T21:00:00Z");
        const madridBoth = await openVisit(madrid, 2, "2020-03-09T23:00:00Z"); // 00:00 по Мадриду

        // 06:30 по Токио, 22:30 по Мадриду
        const closed = await app
            .get(PresenceSettingsService)
            .closeDueSessions(at("2020-03-10T21:30:00Z"));
        expect(closed).toBe(3);

        // вошёл до 05:00 по Токио — выход в 05:00 по Токио
        expect(await visit(tokyoBefore.id)).toMatchObject({
            exitedAt: at("2020-03-10T20:00:00Z"),
            exitMethod: "auto_cron",
            activeEntityRecordId: null,
        });
        // вошёл после сегодняшнего авто-выхода — остаётся
        expect((await visit(tokyoAfter.id)).exitedAt).toBeNull();
        // потолок 2 часа сработал раньше ночного выхода
        expect((await visit(madridCapped.id)).exitedAt).toEqual(at("2020-03-10T20:00:00Z"));
        // потолок ещё не наступил
        expect((await visit(madridFresh.id)).exitedAt).toBeNull();
        // сработали оба правила — выход по раннему: потолок 01:00Z раньше 03:00 по Мадриду (02:00Z)
        expect((await visit(madridBoth.id)).exitedAt).toEqual(at("2020-03-10T01:00:00Z"));

        // повторный проход ничего не переписывает
        expect(
            await app.get(PresenceSettingsService).closeDueSessions(at("2020-03-10T21:30:00Z"))
        ).toBe(0);
    });

    it("auto-closed visits do not distort the average visit length", async () => {
        const [, madrid] = clubs;
        const res = await crm(madrid).get("/crm/presence/stats");
        expect(res.status).toBe(200);
        expect(res.body.avgDurationMinutes).toBeNull();
    });
});
