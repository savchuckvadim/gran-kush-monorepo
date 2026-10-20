import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import cookieParser from "cookie-parser";

import { AppModule } from "../src/app.module";
import { PRODUCT_CODE_ALPHABET } from "../src/modules/portal/crm/catalog/domain/product-code";

import { type Club, financeFixtures } from "./support/finance-club";

jest.setTimeout(120_000);

const suffix = Date.now().toString(36);
const CODE_SHAPE = new RegExp(`^[${PRODUCT_CODE_ALPHABET}]{8}$`);
const BARCODE = `84${Date.now().toString().slice(-11)}`;

/**
 * Сканер CRM (TASK-807): товар получает код этикетки при создании, скан находит товар по коду
 * или штрихкоду только в своём клубе; код входа участника — предпросмотр стойки и только с правом
 * на участников; расходник не продаётся, а списание — только с `catalog.manage`.
 */
describe("Scanner (e2e)", () => {
    let app: INestApplication;
    let fx: ReturnType<typeof financeFixtures>;
    let club: Club;
    let other: Club;
    let manager: string;
    let clerk: string;
    let memberId: string;
    let productId: string;
    let foreignProductId: string;

    const resolve = (code: string, cookies?: string, at: Club = club) =>
        fx.crm(at, "post", "/crm/scan/resolve", cookies).send({ code });
    const product = (id: string, at: Club = club) =>
        fx.crm(at, "get", `/crm/catalog/products/${id}`);
    const patch = (id: string, body: object) =>
        fx.crm(club, "patch", `/crm/catalog/products/${id}`).send(body);
    const qrOf = async (at: Club, member: string): Promise<string> => {
        const res = await fx.crm(at, "post", "/crm/qr-codes/generate").send({ memberId: member });
        expect(res.status).toBe(201);
        return res.body.code as string;
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        app.use(cookieParser());
        await app.init();
        fx = financeFixtures(app, "scn", suffix);
        club = await fx.register("a");
        other = await fx.register("b");
        manager = await fx.seedEmployee(club, "manager");
        // сотрудник без стойки, заказов и карточек участников: видит каталог, но не участников
        await fx.prisma.portalRole.updateMany({
            where: { portalId: club.portalId, key: "employee" },
            data: { permissions: ["records.read"] },
        });
        clerk = await fx.seedEmployee(club, "employee");
        memberId = await fx.seedMember(club);
        productId = await fx.newProduct(club, "jar", 8);
        foreignProductId = await fx.newProduct(other, "jar", 8);
    });

    afterAll(async () => {
        await fx.cleanup([club, other]);
        await app.close();
    });

    it("товар из каталога получает код этикетки; скан P-<код> в любом регистре находит его", async () => {
        const fixture = await fx.prisma.product.findUniqueOrThrow({ where: { id: productId } });
        const created = await fx.crm(club, "post", "/crm/catalog/products").send({
            categoryId: fixture.categoryId,
            measurementUnitId: fixture.measurementUnitId,
            name: `Gloves ${suffix}`,
            price: 0,
            initialQuantity: 50,
            isConsumable: true,
        });
        expect(created.status).toBe(201);
        expect(created.body.code).toMatch(CODE_SHAPE);
        expect(created.body.isConsumable).toBe(true);

        const code = (await product(productId)).body.code as string;
        const found = await resolve(`p-${code.toLowerCase()}`, clerk);
        expect(found.status).toBe(200);
        expect(found.body).toMatchObject({ kind: "product", product: { id: productId, code } });
    });

    it("штрихкод: задаётся в карточке, находится сканом, второй товар с тем же — 409", async () => {
        expect((await patch(productId, { barcode: ` ${BARCODE} ` })).body.barcode).toBe(BARCODE);
        expect((await resolve(BARCODE, manager)).body).toMatchObject({
            kind: "product",
            product: { id: productId },
        });

        const second = await fx.newProduct(club, "bottle", 3);
        const taken = await patch(second, { barcode: BARCODE });
        expect(taken.status).toBe(409);
        expect(taken.body.code).toBe("barcode_taken");

        // другой клуб может завести тот же штрихкод: справочники клубов не пересекаются
        const foreign = await fx
            .crm(other, "patch", `/crm/catalog/products/${foreignProductId}`)
            .send({ barcode: BARCODE });
        expect(foreign.status).toBe(200);
        expect((await resolve(BARCODE, undefined, other)).body.product.id).toBe(foreignProductId);
    });

    it("этикетка другого клуба — не наш товар; строка не код — не распознана", async () => {
        const foreignCode = (await product(foreignProductId, other)).body.code as string;
        expect((await resolve(`P-${foreignCode}`)).body).toEqual({
            kind: "unknown",
            reason: "product_not_found",
        });
        expect((await resolve("hello world")).body).toEqual({
            kind: "unknown",
            reason: "unrecognized",
        });
        expect((await resolve("")).status).toBe(400);
    });

    it("код входа участника — предпросмотр стойки; без прав на участников — 403", async () => {
        const token = await qrOf(club, memberId);
        const seen = await resolve(token, manager);
        expect(seen.status).toBe(200);
        expect(seen.body).toMatchObject({
            kind: "member",
            member: { valid: true, member: { id: memberId }, proposedAction: "entry" },
        });

        const denied = await resolve(token, clerk);
        expect(denied.status).toBe(403);
        expect(denied.body.code).toBe("missing_permission");

        // код участника другого клуба ничего о нём не говорит
        const stranger = await fx.seedMember(other);
        const foreign = await resolve(await qrOf(other, stranger), manager);
        expect(foreign.body).toEqual({
            kind: "member",
            member: expect.objectContaining({ valid: false, errorCode: "wrong_club" }),
        });
        expect(foreign.body.member.member).toBeUndefined();
    });

    it("расходник не продаётся, а списывается — только с catalog.manage", async () => {
        expect((await patch(productId, { isConsumable: true })).body.isConsumable).toBe(true);
        const order = await fx
            .crm(club, "post", "/crm/orders")
            .send({ memberId, items: [{ productId, quantity: 1 }] });
        expect(order.status).toBe(400);

        const writeOff = { productId, reason: "write_off", quantity: 2, note: "Перчатки на смену" };
        expect(
            (await fx.crm(club, "post", "/crm/stock/moves", manager).send(writeOff)).status
        ).toBe(403);
        const done = await fx.crm(club, "post", "/crm/stock/moves").send(writeOff);
        expect(done.status).toBe(201);
        expect(done.body).toMatchObject({ reason: "write_off", quantity: -2, balanceAfter: 98 });
    });
});
