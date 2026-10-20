import type { INestApplication } from "@nestjs/common";

import request from "supertest";

import { PrismaService } from "../../src/common/prisma/prisma.service";

import { crmSession } from "./sessions";

export const FINANCE_PASSWORD = "Password123";
/** Источник фронта из CORS_ORIGIN окружения e2e: запросы с куками проходят проверку Origin. */
const FRONT_ORIGIN = "http://localhost:5000";

export interface Club {
    slug: string;
    portalId: string;
    cookies: string;
}

export type Method = "get" | "post" | "put" | "patch" | "delete";

const cookieHeader = (res: request.Response): string => {
    const raw = res.headers["set-cookie"];
    const cookies: string[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return cookies.map((c) => c.split(";")[0]).join("; ");
};

/**
 * Клубы для наборов учёта: регистрация владельцем, включение финансов через API (пресет ставок и
 * статей), сотрудники ролей, участник и товар; `crm` — запрос CRM от имени клуба.
 */
export const financeFixtures = (app: INestApplication, prefix: string, suffix: string) => {
    const prisma = app.get(PrismaService);

    const crm = (club: Club, method: Method, path: string, cookies = club.cookies) =>
        request(app.getHttpServer())
            [method](path)
            .set("Cookie", cookies)
            .set("X-Portal-Slug", club.slug)
            .set("Origin", FRONT_ORIGIN);

    const register = async (label: string): Promise<Club> => {
        const slug = `${prefix}${label}-${suffix}`;
        const res = await request(app.getHttpServer())
            .post("/platform/portals/register")
            .send({
                name: slug,
                displayName: `${prefix} ${label} ${suffix}`,
                email: `owner-${prefix}-${label}-${suffix}@test.local`,
                password: FINANCE_PASSWORD,
                ownerName: "Owner",
                acceptTerms: true,
            });
        expect(res.status).toBe(201);
        return { slug, portalId: res.body.portal.id as string, cookies: cookieHeader(res) };
    };

    const enableFinance = async (club: Club): Promise<void> => {
        const res = await crm(club, "put", "/crm/portal/modules/finance").send({ enabled: true });
        expect(res.status).toBe(200);
    };

    const seedUser = (label: string) =>
        prisma.user.create({
            data: {
                email: `${label}-${prefix}-${suffix}@test.local`,
                passwordHash: "not-a-real-hash",
                isActive: true,
                emailConfirmed: true,
            },
        });

    const profileRecord = async (club: Club, code: "employee" | "member") => {
        const definition = await prisma.entityDefinition.findFirstOrThrow({
            where: { portalId: club.portalId, code },
        });
        return prisma.entityRecord.create({
            data: { portalId: club.portalId, entityDefinitionId: definition.id },
        });
    };

    /** Сотрудник системной роли клуба; куки его сессии CRM. */
    const seedEmployee = async (club: Club, roleKey: "manager" | "employee"): Promise<string> => {
        const role = await prisma.portalRole.findFirstOrThrow({
            where: { portalId: club.portalId, key: roleKey },
        });
        const user = await seedUser(`${roleKey}-${club.slug}`);
        await prisma.employee.create({
            data: {
                userId: user.id,
                portalId: club.portalId,
                entityRecordId: (await profileRecord(club, "employee")).id,
                roleId: role.id,
                isActive: true,
            },
        });
        return (await crmSession(app, user.id)).cookies;
    };

    const seedMember = async (club: Club): Promise<string> => {
        const user = await seedUser(`member-${club.slug}`);
        const member = await prisma.member.create({
            data: {
                userId: user.id,
                portalId: club.portalId,
                entityRecordId: (await profileRecord(club, "member")).id,
                isActive: true,
            },
        });
        return member.id;
    };

    const newProduct = async (club: Club, name: string, price: number): Promise<string> => {
        const definition = await prisma.entityDefinition.findFirstOrThrow({
            where: { portalId: club.portalId, code: "product" },
        });
        const record = await prisma.entityRecord.create({
            data: { portalId: club.portalId, entityDefinitionId: definition.id },
        });
        const unit = await prisma.measurementUnit.create({
            data: {
                portalId: club.portalId,
                code: `u-${name}-${suffix}`,
                name: "Unit",
                isCustom: true,
            },
        });
        const category = await prisma.productCategory.create({
            data: { portalId: club.portalId, code: `c-${name}-${suffix}`, name: "Cat" },
        });
        const product = await prisma.product.create({
            data: {
                portalId: club.portalId,
                entityRecordId: record.id,
                categoryId: category.id,
                measurementUnitId: unit.id,
                name: `${name} ${suffix}`,
                price,
                initialQuantity: 100,
                currentQuantity: 100,
            },
        });
        return product.id;
    };

    /** Строки заказов держат товары без каскада: сначала заказы, потом клубы и люди. */
    const cleanup = async (clubs: readonly Club[]): Promise<void> => {
        const portals = clubs.map((club) => club.portalId);
        await prisma.order.deleteMany({ where: { portalId: { in: portals } } });
        await prisma.portal.deleteMany({ where: { id: { in: portals } } });
        await prisma.user.deleteMany({
            where: { email: { contains: `-${prefix}`, endsWith: `${suffix}@test.local` } },
        });
    };

    return { prisma, crm, register, enableFinance, seedEmployee, seedMember, newProduct, cleanup };
};
