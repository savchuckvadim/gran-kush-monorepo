import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import { IdempotencyStatus } from "@prisma/client";
import cookieParser from "cookie-parser";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { IdempotencyScope, IdempotencyService } from "../src/common/idempotency";
import { PrismaService } from "../src/common/prisma/prisma.service";
import { enablePortalModule } from "./support/portal-modules";

jest.setTimeout(120_000);

const suffix = Date.now().toString(36);
const PASSWORD = "Password123";

type PortalContext = {
    id: string;
    slug: string;
    cookies: string;
    membershipId: string;
};

const extractCookies = (res: request.Response): string => {
    const setCookie = res.headers["set-cookie"];
    const raw: string[] = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
    return raw.map((c) => c.split(";")[0]).join("; ");
};

/**
 * Перевод кассы в банк: проводка без статьи, пресет модуля финансов не нужен. Сумма и описание
 * в базе зашифрованы, поэтому случаи различаются датой операции.
 */
const entryBody = (amount: number, occurredOn: string) => ({
    direction: "transfer",
    occurredOn,
    account: "cash",
    toAccount: "bank",
    amount,
    description: "Ingreso en banco",
});

describe("Idempotency-Key (e2e)", () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let idempotency: IdempotencyService;

    let portalA: PortalContext;
    let portalB: PortalContext;

    const registerPortal = async (slug: string, email: string): Promise<PortalContext> => {
        const res = await request(app.getHttpServer())
            .post("/platform/portals/register")
            .send({
                name: slug,
                displayName: `Idempotency Test ${slug}`,
                email,
                password: PASSWORD,
                ownerName: "Owner",
                acceptTerms: true,
            });
        expect(res.status).toBe(201);

        const portalId = res.body.portal.id as string;
        await enablePortalModule(prisma, portalId, "finance");
        const employee = await prisma.employee.findFirst({
            where: { portalId },
            select: { id: true },
        });
        if (!employee) {
            throw new Error(`Portal ${slug} has no owner employee`);
        }
        return { id: portalId, slug, cookies: extractCookies(res), membershipId: employee.id };
    };

    const postTransaction = (portal: PortalContext, body: object, key?: string) => {
        const req = request(app.getHttpServer())
            .post("/crm/finance/entries")
            .set("Cookie", portal.cookies)
            .set("X-Portal-Slug", portal.slug);
        if (key) {
            req.set("Idempotency-Key", key);
        }
        return req.send(body);
    };

    const countTransactions = (portalId: string, occurredOn: string) =>
        prisma.ledgerEntry.count({
            where: { portalId, occurredOn: new Date(`${occurredOn}T00:00:00.000Z`) },
        });

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.use(cookieParser());
        await app.init();

        prisma = app.get(PrismaService);
        idempotency = app.get(IdempotencyService);

        portalA = await registerPortal(`idem-a-${suffix}`, `owner-a-${suffix}@test.local`);
        portalB = await registerPortal(`idem-b-${suffix}`, `owner-b-${suffix}@test.local`);
    });

    afterAll(async () => {
        await app?.close();
    });

    it("повтор с тем же ключом не создаёт вторую проводку", async () => {
        const key = `key-repeat-${suffix}`;
        const day = "2026-01-01";
        const body = entryBody(10.5, day);

        const first = await postTransaction(portalA, body, key);
        expect(first.status).toBe(201);

        const second = await postTransaction(portalA, body, key);
        expect(second.status).toBe(201);

        expect(second.body.id).toBe(first.body.id);
        expect(await countTransactions(portalA.id, day)).toBe(1);
    });

    it("без заголовка поведение прежнее — два запроса создают две проводки", async () => {
        const day = "2026-01-02";
        const body = entryBody(11.5, day);

        expect((await postTransaction(portalA, body)).status).toBe(201);
        expect((await postTransaction(portalA, body)).status).toBe(201);

        expect(await countTransactions(portalA.id, day)).toBe(2);
    });

    it("тот же ключ с другим телом — 422, а не тихая подмена ответа", async () => {
        const key = `key-mismatch-${suffix}`;
        const day = "2026-01-03";

        const first = await postTransaction(portalA, entryBody(12.5, day), key);
        expect(first.status).toBe(201);

        const second = await postTransaction(portalA, entryBody(99.99, day), key);
        expect(second.status).toBe(422);

        expect(await countTransactions(portalA.id, day)).toBe(1);
    });

    it("ключ, занятый незавершённым запросом, отвечает 409, а не выполняет операцию второй раз", async () => {
        const key = `key-inflight-${suffix}`;
        const day = "2026-01-04";
        const body = entryBody(13.5, day);

        // Имитируем запрос, который занял ключ и ещё не завершился.
        await prisma.idempotencyKey.create({
            data: {
                scope: IdempotencyScope.CRM_FINANCE_ENTRY_CREATE,
                ownerKey: `${portalA.id}:employee:${portalA.membershipId}`,
                key,
                requestHash: idempotency.hashRequest(body),
                status: IdempotencyStatus.in_progress,
                expiresAt: new Date(Date.now() + 60_000),
            },
        });

        const res = await postTransaction(portalA, body, key);
        expect(res.status).toBe(409);

        expect(await countTransactions(portalA.id, day)).toBe(0);
    });

    it("одинаковый ключ у двух клубов не пересекается — каждый получает свою проводку", async () => {
        const key = `key-shared-${suffix}`;
        const day = "2026-01-05";
        const body = entryBody(14.5, day);

        const inA = await postTransaction(portalA, body, key);
        expect(inA.status).toBe(201);

        const inB = await postTransaction(portalB, body, key);
        expect(inB.status).toBe(201);

        // Совпадение клиентских ключей не должно отдавать клубу B ответ клуба A.
        expect(inB.body.id).not.toBe(inA.body.id);
        expect(await countTransactions(portalA.id, day)).toBe(1);
        expect(await countTransactions(portalB.id, day)).toBe(1);
    });

    it("неудачный запрос освобождает ключ, и осмысленный ретрай проходит", async () => {
        const key = `key-release-${suffix}`;
        const day = "2026-01-06";

        // Перевод на тот же счёт — сервис отвергает проводку уже после занятия ключа.
        const failed = await postTransaction(
            portalA,
            { ...entryBody(15.5, day), toAccount: "cash" },
            key
        );
        expect(failed.status).toBeGreaterThanOrEqual(400);

        const held = await prisma.idempotencyKey.findFirst({
            where: { key, scope: IdempotencyScope.CRM_FINANCE_ENTRY_CREATE },
        });
        expect(held).toBeNull();

        const retried = await postTransaction(portalA, entryBody(15.5, day), key);
        expect(retried.status).toBe(201);
    });
});
