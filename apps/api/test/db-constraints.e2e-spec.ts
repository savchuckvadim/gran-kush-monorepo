import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";

jest.setTimeout(120_000);

const suffix = Date.now().toString(36);

/** Prisma code of a violated foreign key. */
const FOREIGN_KEY_VIOLATION = "P2003";

interface ConstraintRow {
    table: string;
    constraint: string;
}

/**
 * Изоляция клубов в самой схеме (TASK-822): строка одного клуба не может ссылаться на строку
 * другого, даже если сервис забыл проверить портал. Первые два теста читают каталог Postgres и
 * ловят новую связь, сделанную не по правилу; остальные проверяют поведение ключей на данных.
 */
describe("Tenant constraints in the database (e2e)", () => {
    let app: INestApplication;
    let prisma: PrismaService;
    const portalIds: string[] = [];
    let userId = "";

    /** Клуб с одним товаром: минимум строк, которого требует схема. */
    const createClub = async (tag: string) => {
        const portal = await prisma.portal.create({
            data: { name: `tc-${tag}-${suffix}`, displayName: `Tenant constraints ${tag}` },
        });
        const portalId = portal.id;
        portalIds.push(portalId);

        const definition = await prisma.entityDefinition.create({
            data: { portalId, code: "tc_record", name: "Record" },
        });
        const record = () =>
            prisma.entityRecord.create({ data: { portalId, entityDefinitionId: definition.id } });
        const category = await prisma.productCategory.create({
            data: { portalId, code: "main", name: "Main" },
        });
        const unit = await prisma.measurementUnit.create({
            data: { portalId, code: "pc", name: "Piece" },
        });
        const product = await prisma.product.create({
            data: {
                portalId,
                entityRecordId: (await record()).id,
                categoryId: category.id,
                measurementUnitId: unit.id,
                name: "Product",
                code: "TC1",
                price: 1,
                initialQuantity: 1,
                currentQuantity: 1,
            },
        });
        return { portalId, record, categoryId: category.id, productId: product.id };
    };

    beforeAll(async () => {
        const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
        app = moduleFixture.createNestApplication();
        await app.init();
        prisma = app.get(PrismaService);
    });

    afterAll(async () => {
        await prisma.portal.deleteMany({ where: { id: { in: portalIds } } });
        if (userId) await prisma.user.deleteMany({ where: { id: userId } });
        await app.close();
    });

    it("every foreign key between two portal tables carries portal_id", async () => {
        const single = await prisma.$queryRaw<ConstraintRow[]>`
            SELECT c.conrelid::regclass::text AS "table", c.conname AS "constraint"
            FROM pg_constraint c
            WHERE c.contype = 'f'
              AND c.connamespace = 'public'::regnamespace
              AND c.confrelid <> 'public.portals'::regclass
              AND EXISTS (
                  SELECT 1 FROM pg_attribute a
                  WHERE a.attrelid = c.conrelid AND a.attname = 'portal_id'
                    AND a.attnotnull AND NOT a.attisdropped
              )
              AND EXISTS (
                  SELECT 1 FROM pg_attribute a
                  WHERE a.attrelid = c.confrelid AND a.attname = 'portal_id'
                    AND a.attnotnull AND NOT a.attisdropped
              )
              AND NOT EXISTS (
                  SELECT 1 FROM pg_attribute a
                  WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
                    AND a.attname = 'portal_id'
              )
            ORDER BY 1, 2`;

        // A relation listed here needs `fields: [xId, portalId], references: [id, portalId]`.
        expect(single).toEqual([]);
    });

    it("ON DELETE SET NULL of a composite key never nulls portal_id", async () => {
        const plain = await prisma.$queryRaw<ConstraintRow[]>`
            SELECT c.conrelid::regclass::text AS "table", c.conname AS "constraint"
            FROM pg_constraint c
            WHERE c.contype = 'f'
              AND c.connamespace = 'public'::regnamespace
              AND c.confdeltype = 'n'
              AND EXISTS (
                  SELECT 1 FROM pg_attribute a
                  WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
                    AND a.attname = 'portal_id'
              )
              AND (
                  c.confdelsetcols IS NULL
                  OR EXISTS (
                      SELECT 1 FROM pg_attribute a
                      WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.confdelsetcols)
                        AND a.attname = 'portal_id'
                  )
              )
            ORDER BY 1, 2`;

        // Prisma writes plain SET NULL; the migration must say `ON DELETE SET NULL ("x_id")`.
        expect(plain).toEqual([]);
    });

    it("rejects an order item with a product of another portal", async () => {
        const [clubA, clubB] = [await createClub("a"), await createClub("b")];
        const user = await prisma.user.create({
            data: {
                email: `tc-member-${suffix}@test.local`,
                passwordHash: "not-a-real-hash",
                isActive: true,
                emailConfirmed: true,
            },
        });
        userId = user.id;
        const member = await prisma.member.create({
            data: {
                userId,
                portalId: clubA.portalId,
                entityRecordId: (await clubA.record()).id,
            },
        });
        const order = await prisma.order.create({
            data: {
                portalId: clubA.portalId,
                entityRecordId: (await clubA.record()).id,
                memberId: member.id,
                orderNumber: `TC-${suffix}`,
                subtotal: 1,
                total: 1,
            },
        });
        const item = (productId: string) =>
            prisma.orderItem.create({
                data: {
                    portalId: clubA.portalId,
                    orderId: order.id,
                    productId,
                    quantity: 1,
                    unitPrice: 1,
                    totalPrice: 1,
                },
            });

        await expect(item(clubB.productId)).rejects.toMatchObject({ code: FOREIGN_KEY_VIOLATION });
        await expect(item(clubA.productId)).resolves.toMatchObject({ portalId: clubA.portalId });
    });

    it("rejects an optional reference to a row of another portal", async () => {
        const [clubA, clubB] = [await createClub("c"), await createClub("d")];

        await expect(
            prisma.productCategory.update({
                where: { id: clubA.categoryId },
                data: { parentId: clubB.categoryId },
            })
        ).rejects.toMatchObject({ code: FOREIGN_KEY_VIOLATION });
    });

    it("deleting a parent clears the reference and keeps the row in its portal", async () => {
        const club = await createClub("e");
        const child = await prisma.productCategory.create({
            data: {
                portalId: club.portalId,
                code: "child",
                name: "Child",
                parentId: club.categoryId,
            },
        });
        await prisma.product.deleteMany({ where: { portalId: club.portalId } });

        await prisma.productCategory.delete({ where: { id: club.categoryId } });

        await expect(
            prisma.productCategory.findUniqueOrThrow({ where: { id: child.id } })
        ).resolves.toMatchObject({ parentId: null, portalId: club.portalId });
    });
});
