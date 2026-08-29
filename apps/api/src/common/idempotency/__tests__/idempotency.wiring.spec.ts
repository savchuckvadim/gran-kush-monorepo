import { Body, Controller, INestApplication, Post } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { IdempotencyStatus } from "@prisma/client";
import type { Request, Response } from "express";
import request from "supertest";

import { PrismaService } from "@common/prisma/prisma.service";

import { IdempotencyScope } from "../idempotency.constants";
import { IdempotencyModule } from "../idempotency.module";
import { Idempotent } from "../idempotent.decorator";

const PRINCIPAL = {
    portalId: "portal-a",
    principalType: "member",
    membershipId: "m-1",
};

@Controller("wiring")
class WiringController {
    @Post()
    @Idempotent(IdempotencyScope.LK_ORDER_CREATE)
    create(@Body() body: { amount: number }): { id: string; amount: number } {
        return { id: `order-${body.amount}`, amount: body.amount };
    }
}

/**
 * Интерцептор навешивается декоратором в чужом модуле и должен резолвиться из
 * глобального IdempotencyModule без явного импорта. Ошибка здесь ломала бы каждый
 * защищённый маршрут на старте приложения, а не в тестах сервиса.
 */
describe("IdempotencyModule — подключение в чужом модуле", () => {
    let app: INestApplication;
    let store: Map<string, Record<string, unknown>>;

    const rowKey = (where: { scope: string; ownerKey: string; key: string }) =>
        `${where.scope}|${where.ownerKey}|${where.key}`;

    beforeAll(async () => {
        store = new Map();

        const prismaMock = {
            idempotencyKey: {
                // Условие expiresAt соблюдаем: без него мок сносил бы живую строку
                // и «повтор» каждый раз выглядел бы как первый запрос.
                deleteMany: jest.fn(({ where }: { where: Record<string, unknown> }) => {
                    if (typeof where.key !== "string") {
                        return Promise.resolve({ count: 0 });
                    }
                    const id = rowKey(where as { scope: string; ownerKey: string; key: string });
                    const row = store.get(id);
                    const bound = (where.expiresAt as { lt?: Date } | undefined)?.lt;
                    const expired =
                        row !== undefined &&
                        bound !== undefined &&
                        (row.expiresAt as Date).getTime() < bound.getTime();
                    if (row !== undefined && (bound === undefined || expired)) {
                        store.delete(id);
                        return Promise.resolve({ count: 1 });
                    }
                    return Promise.resolve({ count: 0 });
                }),
                createMany: jest.fn(({ data }: { data: Array<Record<string, unknown>> }) => {
                    const row = data[0];
                    const id = rowKey(row as { scope: string; ownerKey: string; key: string });
                    if (store.has(id)) {
                        return Promise.resolve({ count: 0 });
                    }
                    store.set(id, { ...row, status: IdempotencyStatus.in_progress });
                    return Promise.resolve({ count: 1 });
                }),
                findUnique: jest.fn(
                    ({
                        where,
                    }: {
                        where: {
                            scope_ownerKey_key: { scope: string; ownerKey: string; key: string };
                        };
                    }) => Promise.resolve(store.get(rowKey(where.scope_ownerKey_key)) ?? null)
                ),
                updateMany: jest.fn(
                    ({
                        where,
                        data,
                    }: {
                        where: { scope: string; ownerKey: string; key: string };
                        data: Record<string, unknown>;
                    }) => {
                        const id = rowKey(where);
                        const existing = store.get(id);
                        if (existing) {
                            store.set(id, { ...existing, ...data });
                        }
                        return Promise.resolve({ count: existing ? 1 : 0 });
                    }
                ),
            },
        };

        const moduleRef = await Test.createTestingModule({
            imports: [IdempotencyModule],
            controllers: [WiringController],
        })
            .overrideProvider(PrismaService)
            .useValue(prismaMock)
            .compile();

        app = moduleRef.createNestApplication();
        // Принципал ставит MembershipGuard; здесь подменяем его минимальной заглушкой.
        app.use((req: Request, _res: Response, next: () => void) => {
            req.principal = PRINCIPAL as never;
            next();
        });
        await app.init();
    });

    afterAll(async () => {
        await app?.close();
    });

    it("повтор с тем же ключом отдаёт сохранённый ответ и не выполняет обработчик заново", async () => {
        const first = await request(app.getHttpServer())
            .post("/wiring")
            .set("Idempotency-Key", "wire-1")
            .send({ amount: 10 });
        expect(first.status).toBe(201);
        expect(first.body).toEqual({ id: "order-10", amount: 10 });

        const second = await request(app.getHttpServer())
            .post("/wiring")
            .set("Idempotency-Key", "wire-1")
            .send({ amount: 10 });
        expect(second.status).toBe(201);
        expect(second.body).toEqual({ id: "order-10", amount: 10 });
    });

    it("тот же ключ с другим телом — 422", async () => {
        await request(app.getHttpServer())
            .post("/wiring")
            .set("Idempotency-Key", "wire-2")
            .send({ amount: 20 });

        const mismatch = await request(app.getHttpServer())
            .post("/wiring")
            .set("Idempotency-Key", "wire-2")
            .send({ amount: 21 });

        expect(mismatch.status).toBe(422);
    });

    it("без заголовка маршрут работает как раньше", async () => {
        const res = await request(app.getHttpServer()).post("/wiring").send({ amount: 30 });

        expect(res.status).toBe(201);
        expect(res.body).toEqual({ id: "order-30", amount: 30 });
    });
});
