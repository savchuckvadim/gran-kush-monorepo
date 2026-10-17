import { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";

import * as bcrypt from "bcrypt";
import cookieParser from "cookie-parser";
import { writeFileSync } from "fs";
import { join } from "path";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";

import {
    collectRouteAuth,
    renderRouteMatrix,
    routeAuthViolations,
} from "./support/route-auth-inventory";
import { cabinetSession } from "./support/sessions";

jest.setTimeout(120_000);

const MATRIX_FILE = join(__dirname, "../../../documentation/backend/AUTH_ROUTES.md");
const suffix = Date.now().toString(36);

/**
 * Аудит маршрутов (TASK-742): каждый маршрут объявляет доступ явно, права стоят только под
 * `CrmAuth`; изменяющий запрос с кукой сессии принимается только с наших фронтов.
 */
describe("Route access (e2e)", () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        app.use(cookieParser());
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it("every route is @Public() or behind a session guard, permissions only under CrmAuth", () => {
        const routes = collectRouteAuth(app);
        expect(routes.length).toBeGreaterThan(100);
        if (process.env.WRITE_AUTH_MATRIX === "1") {
            writeFileSync(MATRIX_FILE, renderRouteMatrix(routes));
        }
        expect(routeAuthViolations(routes)).toEqual([]);
    });

    describe("forged requests from another origin (CSRF)", () => {
        let cookies: string;
        const email = `origin-${suffix}@test.local`;

        beforeAll(async () => {
            const prisma = app.get(PrismaService);
            const user = await prisma.user.create({
                data: {
                    email,
                    passwordHash: await bcrypt.hash("Password123", 4),
                    status: "active",
                    isActive: true,
                    emailConfirmed: true,
                },
            });
            cookies = (await cabinetSession(app, user.id)).cookies;
        });

        afterAll(async () => {
            await app.get(PrismaService).user.deleteMany({ where: { email } });
        });

        const signOutOthers = () =>
            request(app.getHttpServer())
                .post("/cabinet/account/sessions/sign-out-others")
                .set("Cookie", cookies);

        it("a sibling subdomain can not post with the session cookie", async () => {
            const forged = await signOutOthers().set("Origin", "https://paf-paf.app");
            expect(forged.status).toBe(403);
            expect(forged.body.code).toBe("origin_not_allowed");

            const byReferer = await signOutOthers().set("Referer", "https://evil.example/page");
            expect(byReferer.status).toBe(403);
        });

        it("our frontends and requests without an origin pass", async () => {
            const front = app.get(ConfigService).get<string>("CORS_ORIGIN")?.split(",")[0]?.trim();
            if (front) {
                expect((await signOutOthers().set("Origin", front)).status).toBe(200);
            }
            expect((await signOutOthers()).status).toBe(200);
        });

        it("forms are not parsed at all", async () => {
            const res = await request(app.getHttpServer())
                .put("/cabinet/account/security/password")
                .set("Cookie", cookies)
                .type("form")
                .send({ newPassword: "Hijacked12345" });
            expect(res.status).toBe(400);
        });
    });
});
