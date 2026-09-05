import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import cookieParser from "cookie-parser";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";
import { MiB, UPLOAD_LIMITS } from "../src/common/upload";
import { MemberAuthService } from "../src/modules/portal/auth/members/application/services/member-auth.service";

jest.setTimeout(120_000);

const suffix = Date.now().toString(36);
const PASSWORD = "Password123";

const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const HTML = Buffer.from("<html><script>alert(1)</script></html>");

const dataUrl = (mime: string, bytes: Buffer) => `data:${mime};base64,${bytes.toString("base64")}`;
const pngOfSize = (bytes: number) =>
    Buffer.concat([PNG_HEADER, Buffer.alloc(bytes - PNG_HEADER.length)]);

const extractCookies = (res: request.Response): string => {
    const setCookie = res.headers["set-cookie"];
    const raw: string[] = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
    return raw.map((c) => c.split(";")[0]).join("; ");
};

/**
 * Успешная загрузка сюда не входит: она упирается в живой S3. Здесь проверяется, что
 * мусор, чужие типы и лишние мегабайты отсекаются до хранилища и до очереди.
 */
describe("Uploads (e2e)", () => {
    let app: INestApplication;
    let prisma: PrismaService;

    let portalId: string;
    let portalSlug: string;
    let employeeCookies: string;
    let memberCookies: string;
    let memberId: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        // Как в main.ts: парсеры тела с разными потолками регистрирует AppModule
        app = moduleFixture.createNestApplication({ bodyParser: false });
        app.use(cookieParser());
        await app.init();

        prisma = app.get(PrismaService);

        portalSlug = `upl-${suffix}`;
        const portalRes = await request(app.getHttpServer())
            .post("/platform/portals/register")
            .send({
                name: portalSlug,
                displayName: `Uploads Test ${portalSlug}`,
                email: `owner-${suffix}@test.local`,
                password: PASSWORD,
                ownerName: "Owner",
            });
        expect(portalRes.status).toBe(201);
        portalId = portalRes.body.portal.id as string;
        employeeCookies = extractCookies(portalRes);

        // Аккаунт и токен — напрямую: публичная регистрация шлёт письмо, а рендер шаблона
        // в jest падает на dynamic import
        const memberUser = await prisma.user.create({
            data: {
                email: `member-${suffix}@test.local`,
                passwordHash: "not-a-real-hash",
                isActive: true,
                emailConfirmed: true,
            },
        });
        const userId = memberUser.id;
        const tokens = await app
            .get(MemberAuthService)
            .generateTokens({ id: userId, email: memberUser.email }, `device-${suffix}`);
        memberCookies = `member_access_token=${tokens.accessToken}`;

        const memberDefinition = await prisma.entityDefinition.findFirst({
            where: { portalId, code: "member" },
            select: { id: true },
        });
        if (!memberDefinition) {
            throw new Error("Portal has no provisioned 'member' entity definition");
        }
        const entityRecord = await prisma.entityRecord.create({
            data: { portalId, entityDefinitionId: memberDefinition.id },
        });
        const member = await prisma.member.create({
            data: { userId, portalId, entityRecordId: entityRecord.id, isActive: true },
        });
        memberId = member.id;
    });

    afterAll(async () => {
        await prisma.portal.deleteMany({ where: { id: portalId } });
        await prisma.user.deleteMany({ where: { email: { endsWith: `${suffix}@test.local` } } });
        await app.close();
    });

    const postAccountDocument = (file: string) =>
        request(app.getHttpServer())
            .post("/lk/account/documents")
            .set("Cookie", memberCookies)
            .send({ type: "passport", file });

    describe("тип по содержимому, а не по заявке клиента", () => {
        it("HTML под видом image/png → 400", async () => {
            const res = await postAccountDocument(dataUrl("image/png", HTML));
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/not supported/);
        });

        it("подпись не может быть PDF", async () => {
            const res = await request(app.getHttpServer())
                .put("/lk/account/signature")
                .set("Cookie", memberCookies)
                .send({ file: dataUrl("image/png", Buffer.from("%PDF-1.7\n")) });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/not supported/);
        });

        it("не data URL → 400 ещё на валидации DTO", async () => {
            const res = await postAccountDocument("https://evil.example/x.png");
            expect(res.status).toBe(400);
        });

        it("документ без файлов в аккаунте не появился", async () => {
            const res = await request(app.getHttpServer())
                .get("/lk/account/documents")
                .set("Cookie", memberCookies);
            expect(res.status).toBe(200);
            expect(res.body.documents).toEqual([]);
        });
    });

    describe("размер", () => {
        it("документ больше лимита → 400 с понятной причиной, а не 413 от парсера", async () => {
            const res = await postAccountDocument(
                dataUrl("image/png", pngOfSize(UPLOAD_LIMITS.documentBytes + 1))
            );
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/exceeds/);
        });

        it("тело сверх потолка маршрута загрузки → 413", async () => {
            const res = await postAccountDocument(
                dataUrl("image/png", pngOfSize(3 * UPLOAD_LIMITS.documentBytes))
            );
            expect(res.status).toBe(413);
        });

        it("широкий потолок только на маршрутах загрузки: тот же JSON на другом маршруте → 413", async () => {
            const payload = { email: `x-${suffix}@test.local`, padding: "a".repeat(2 * MiB) };
            const res = await request(app.getHttpServer())
                .post("/lk/auth/member/check")
                .send(payload);
            expect(res.status).toBe(413);
        });
    });

    describe("очередь регистрации", () => {
        it("мусор отклоняется синхронно, а не оседает в Redis с молчаливым падением воркера", async () => {
            const res = await request(app.getHttpServer())
                .post("/lk/auth/member/files")
                .set("Cookie", memberCookies)
                .send({ documentType: "passport", documentFirst: dataUrl("image/jpeg", HTML) });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/not supported/);
        });

        it("подпись проверяется по своему лимиту", async () => {
            const res = await request(app.getHttpServer())
                .post("/lk/auth/member/files")
                .set("Cookie", memberCookies)
                .send({
                    signature: dataUrl("image/png", pngOfSize(UPLOAD_LIMITS.signatureBytes + 1)),
                });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/signature file exceeds/);
        });
    });

    describe("CRM multipart", () => {
        const patchFiles = () =>
            request(app.getHttpServer())
                .patch(`/crm/members/${memberId}/files`)
                .set("Cookie", employeeCookies)
                .set("X-Portal-Slug", portalSlug);

        it("файл больше лимита multer → 413", async () => {
            const res = await patchFiles().attach(
                "documentFirst",
                pngOfSize(UPLOAD_LIMITS.documentBytes + 1),
                "passport.png"
            );
            expect(res.status).toBe(413);
        });

        it("HTML с расширением .png и image/png в multipart → 400", async () => {
            const res = await patchFiles().attach("documentFirst", HTML, {
                filename: "passport.png",
                contentType: "image/png",
            });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/not supported/);
        });

        it("неизвестное поле файла отклоняется", async () => {
            const res = await patchFiles().attach("avatar", pngOfSize(64), "avatar.png");
            expect(res.status).toBe(400);
        });
    });
});
