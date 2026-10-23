import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { Prisma } from "@prisma/client";
import type { Server } from "http";
import request from "supertest";

import { BrandModule } from "@common/brand/brand.module";
import { PrismaService } from "@common/prisma/prisma.service";
import { BillingModule } from "@modules/billing/billing.module";
import { PlatformJwtAuthGuard } from "@modules/platform/auth/infrastructure/guards/platform-jwt-auth.guard";
import {
    CabinetSessionGuard,
    CrmSessionGuard,
} from "@modules/portal/auth/sessions/api/session.guard";
import { PortalContextModule } from "@modules/portal/crm/portals/portal-context.module";

const PLANS_URL = "/platform/billing/plans";

/**
 * Модуль поднимается целиком вместе с PortalContextModule — тем же middleware, что в
 * приложении: маршрут обязан работать без заголовков портала, а это свойство
 * middleware, а не контроллера.
 */
describe("GET /platform/billing/plans — публичный каталог тарифов", () => {
    let app: INestApplication<Server>;
    const findMany = jest.fn();

    beforeAll(async () => {
        // На моке нет prisma.portal: попытка middleware резолвить портал уронила бы запрос в 500.
        const prismaMock = { billingPlan: { findMany } };

        const moduleRef = await Test.createTestingModule({
            imports: [BrandModule, PortalContextModule, BillingModule],
        })
            .overrideProvider(PrismaService)
            .useValue(prismaMock)
            // Сессии (глобальный SessionsModule) здесь не подняты; публичному маршруту они и не нужны
            .overrideGuard(CrmSessionGuard)
            .useValue({ canActivate: () => false })
            .overrideGuard(CabinetSessionGuard)
            .useValue({ canActivate: () => false })
            .overrideGuard(PlatformJwtAuthGuard)
            .useValue({ canActivate: () => false })
            .compile();

        app = moduleRef.createNestApplication<INestApplication<Server>>();
        await app.init();
    });

    afterAll(async () => {
        await app?.close();
    });

    beforeEach(() => {
        findMany.mockResolvedValue([
            {
                code: "trial",
                name: "Trial",
                priceAmount: new Prisma.Decimal("0"),
                currency: "EUR",
                interval: "month",
                featuresJson: { crm: true, sites: true, messenger: false },
            },
            {
                code: "club-month",
                name: "Club",
                priceAmount: new Prisma.Decimal("49"),
                currency: "EUR",
                interval: "month",
                featuresJson: { crm: true },
            },
        ]);
    });

    it("отвечает без авторизации и без заголовков портала", async () => {
        const res = await request(app.getHttpServer()).get(PLANS_URL);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            plans: [
                {
                    code: "trial",
                    name: "Trial",
                    priceAmount: "0.00",
                    currency: "EUR",
                    interval: "month",
                    features: { crm: true, sites: true, messenger: false },
                },
                {
                    code: "club-month",
                    name: "Club",
                    priceAmount: "49.00",
                    currency: "EUR",
                    interval: "month",
                    features: { crm: true },
                },
            ],
        });
    });

    it("разрешает держать ответ в общих кэшах пять минут", async () => {
        const res = await request(app.getHttpServer()).get(PLANS_URL);

        expect(res.get("Cache-Control")).toBe("public, max-age=300");
    });

    it("не резолвит заголовки портала: несуществующий slug не превращает ответ в 401", async () => {
        const res = await request(app.getHttpServer())
            .get(PLANS_URL)
            .set("X-Portal-Slug", "no-such-club");

        expect(res.status).toBe(200);
    });

    it("не разрешает кэшировать ошибку: иначе общий кэш держал бы 500 пять минут", async () => {
        findMany.mockRejectedValueOnce(new Error("db down"));

        const res = await request(app.getHttpServer()).get(PLANS_URL);

        expect(res.status).toBe(500);
        expect(res.get("Cache-Control")).toBeUndefined();
    });
});
