import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import { IdempotencyStatus } from "@prisma/client";
import cookieParser from "cookie-parser";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { IdempotencyScope, IdempotencyService } from "../src/common/idempotency";
import { PrismaService } from "../src/common/prisma/prisma.service";

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

const transactionBody = (amount: number, description: string) => ({
    type: "manual",
    direction: "income",
    amount,
    currency: "EUR",
    description,
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
            });
        expect(res.status).toBe(201);

        const portalId = res.body.portal.id as string;
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
            .post("/crm/finance/transactions")
            .set("Cookie", portal.cookies)
            .set("X-Portal-Slug", portal.slug);
        if (key) {
            req.set("Idempotency-Key", key);
        }
        return req.send(body);
    };

    const countTransactions = (portalId: string, description: string) =>
        prisma.financialTransaction.count({ where: { portalId, description } });

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
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
        const description = `IDEM-REPEAT-${suffix}`;
        const body = transactionBody(10.5, description);

        const first = await postTransaction(portalA, body, key);
        expect(first.status).toBe(201);

        const second = await postTransaction(portalA, body, key);
        expect(second.status).toBe(201);

        expect(second.body.id).toBe(first.body.id);
        expect(await countTransactions(portalA.id, description)).toBe(1);
    });

    it("без заголовка поведение прежнее — два запроса создают две проводки", async () => {
        const description = `IDEM-NOKEY-${suffix}`;
        const body = transactionBody(11.5, description);

        expect((await postTransaction(portalA, body)).status).toBe(201);
        expect((await postTransaction(portalA, body)).status).toBe(201);

        expect(await countTransactions(portalA.id, description)).toBe(2);
    });

    it("тот же ключ с другим телом — 422, а не тихая подмена ответа", async () => {
        const key = `key-mismatch-${suffix}`;
        const description = `IDEM-MISMATCH-${suffix}`;

        const first = await postTransaction(portalA, transactionBody(12.5, description), key);
        expect(first.status).toBe(201);

        const second = await postTransaction(portalA, transactionBody(99.99, description), key);
        expect(second.status).toBe(422);

        expect(await countTransactions(portalA.id, description)).toBe(1);
    });

    it("ключ, занятый незавершённым запросом, отвечает 409, а не выполняет операцию второй раз", async () => {
        const key = `key-inflight-${suffix}`;
        const description = `IDEM-INFLIGHT-${suffix}`;
        const body = transactionBody(13.5, description);

        // Имитируем запрос, который занял ключ и ещё не завершился.
        await prisma.idempotencyKey.create({
            data: {
                scope: IdempotencyScope.CRM_FINANCE_TRANSACTION_CREATE,
                ownerKey: `${portalA.id}:employee:${portalA.membershipId}`,
                key,
                requestHash: idempotency.hashRequest(body),
                status: IdempotencyStatus.in_progress,
                expiresAt: new Date(Date.now() + 60_000),
            },
        });

        const res = await postTransaction(portalA, body, key);
        expect(res.status).toBe(409);

        expect(await countTransactions(portalA.id, description)).toBe(0);
    });

    it("одинаковый ключ у двух клубов не пересекается — каждый получает свою проводку", async () => {
        const key = `key-shared-${suffix}`;
        const description = `IDEM-SHARED-${suffix}`;
        const body = transactionBody(14.5, description);

        const inA = await postTransaction(portalA, body, key);
        expect(inA.status).toBe(201);

        const inB = await postTransaction(portalB, body, key);
        expect(inB.status).toBe(201);

        // Совпадение клиентских ключей не должно отдавать клубу B ответ клуба A.
        expect(inB.body.id).not.toBe(inA.body.id);
        expect(await countTransactions(portalA.id, description)).toBe(1);
        expect(await countTransactions(portalB.id, description)).toBe(1);
    });

    it("неудачный запрос освобождает ключ, и осмысленный ретрай проходит", async () => {
        const key = `key-release-${suffix}`;
        const description = `IDEM-RELEASE-${suffix}`;

        // Несуществующий участник — сервис отвергает проводку уже после занятия ключа.
        const failed = await postTransaction(
            portalA,
            {
                ...transactionBody(15.5, description),
                memberId: "00000000-0000-4000-8000-000000000000",
            },
            key
        );
        expect(failed.status).toBeGreaterThanOrEqual(400);

        const held = await prisma.idempotencyKey.findFirst({
            where: { key, scope: IdempotencyScope.CRM_FINANCE_TRANSACTION_CREATE },
        });
        expect(held).toBeNull();

        const retried = await postTransaction(portalA, transactionBody(15.5, description), key);
        expect(retried.status).toBe(201);
    });
});
