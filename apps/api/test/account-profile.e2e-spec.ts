import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import * as bcrypt from "bcrypt";
import cookieParser from "cookie-parser";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";

import { cabinetSession } from "./support/sessions";

jest.setTimeout(120_000);

const suffix = Date.now().toString(36);

/** Профиль аккаунта (TASK-715, решение 11): данные человека для анкет новых клубов. */
describe("Account profile (e2e)", () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let cookies: string;

    const profile = {
        firstName: "Ana",
        lastName: "García",
        birthday: "1990-05-10",
        phone: "+34 600 000 000",
        address: "",
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        app.use(cookieParser());
        await app.init();
        prisma = app.get(PrismaService);

        const email = `profile-${suffix}@test.local`;
        const user = await prisma.user.create({
            data: {
                email,
                passwordHash: await bcrypt.hash("Password123", 4),
                status: "active",
                isActive: true,
                emailConfirmed: true,
            },
        });
        const tokens = await cabinetSession(app, user.id, `device-${suffix}`);
        cookies = tokens.cookies;
    });

    afterAll(async () => {
        await prisma.user.deleteMany({ where: { email: { endsWith: `${suffix}@test.local` } } });
        await app.close();
    });

    const api = () => ({
        get: () =>
            request(app.getHttpServer()).get("/cabinet/account/profile").set("Cookie", cookies),
        put: (body: object) =>
            request(app.getHttpServer())
                .put("/cabinet/account/profile")
                .set("Cookie", cookies)
                .send(body),
    });

    it("an account without a profile reads an empty one", async () => {
        const res = await api().get();
        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            firstName: null,
            lastName: null,
            birthday: null,
            phone: null,
            address: null,
            memberFields: {},
        });
    });

    it("saves the profile; empty strings mean «not set»; the club form keys come with it", async () => {
        const saved = await api().put(profile);
        expect(saved.status).toBe(200);
        expect(saved.body).toMatchObject({ ...profile, address: null });
        expect(saved.body.memberFields).toEqual({
            first_name: "Ana",
            last_name: "García",
            birthday: "1990-05-10",
            phone: "+34 600 000 000",
        });
        expect((await api().get()).body.birthday).toBe("1990-05-10");
    });

    it("rejects a malformed date and a partial body", async () => {
        expect((await api().put({ ...profile, birthday: "10/05/1990" })).status).toBe(400);
        expect((await api().put({ firstName: "Ana" })).status).toBe(400);
    });

    it("needs a session", async () => {
        const res = await request(app.getHttpServer()).get("/cabinet/account/profile");
        expect(res.status).toBe(401);
    });
});
