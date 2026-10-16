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

/** Тема клуба по умолчанию (TASK-712, решение 10): ставит администратор, видят CRM и кабинет. */
describe("Portal appearance (e2e)", () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let ownerCookies: string;
    let portalId: string;
    const slug = `skin-${suffix}`;

    const crm = (method: "get" | "patch", url: string) =>
        request(app.getHttpServer())
            [method](url)
            .set("Cookie", ownerCookies)
            .set("X-Portal-Slug", slug);

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        app.use(cookieParser());
        await app.init();
        prisma = app.get(PrismaService);

        const res = await request(app.getHttpServer())
            .post("/platform/portals/register")
            .send({
                name: slug,
                displayName: `Skin ${suffix}`,
                email: `owner-${slug}@test.local`,
                password: PASSWORD,
                ownerName: "Owner",
                acceptTerms: true,
            });
        expect(res.status).toBe(201);
        ownerCookies = cookieHeader(res);
        portalId = res.body.portal.id as string;
    });

    afterAll(async () => {
        await prisma.portal.deleteMany({ where: { id: portalId } });
        await prisma.user.deleteMany({ where: { email: { endsWith: `${suffix}@test.local` } } });
        await app.close();
    });

    it("starts with the PafPaf theme", async () => {
        const info = await crm("get", "/crm/portal/info");
        expect(info.body.defaultSkin).toBeNull();
    });

    it("the admin sets the club theme; staff and members see it", async () => {
        const saved = await crm("patch", "/crm/portal/appearance").send({ defaultSkin: "coqueta" });
        expect(saved.status).toBe(200);
        expect((await crm("get", "/crm/portal/info")).body.defaultSkin).toBe("coqueta");

        const email = `member-${suffix}@test.local`;
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
        const cookies = `member_access_token=${tokens.accessToken}`;
        await crm("patch", "/crm/settings/club-policy").send({ joinPolicy: "approval" });
        await request(app.getHttpServer())
            .post(`/cabinet/portals/${slug}/join`)
            .set("Cookie", cookies)
            .send({ fields: { first_name: "Skin" } })
            .expect(201);

        const memberships = await request(app.getHttpServer())
            .get("/cabinet/memberships")
            .set("Cookie", cookies);
        const club = memberships.body.memberships.find((m: { slug: string }) => m.slug === slug);
        expect(club.defaultSkin).toBe("coqueta");
    });

    it("rejects a malformed theme id and clears it with null", async () => {
        const bad = await crm("patch", "/crm/portal/appearance").send({ defaultSkin: "<b>x</b>" });
        expect(bad.status).toBe(400);

        const cleared = await crm("patch", "/crm/portal/appearance").send({ defaultSkin: null });
        expect(cleared.body).toEqual({ defaultSkin: null });
    });

    it("only an admin changes the theme", async () => {
        const res = await request(app.getHttpServer())
            .patch("/crm/portal/appearance")
            .set("X-Portal-Slug", slug)
            .send({ defaultSkin: "coqueta" });
        expect(res.status).toBe(401);
    });
});
