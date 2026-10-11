import { Injectable } from "@nestjs/common";

import { Prisma } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import { MEMBER_FIELD_KEYS } from "@modules/portal/crm/entity-fields/constants/member-field-keys";
import {
    buildMemberFieldMap,
    type FieldRow,
    getMemberDisplayNameParts,
} from "@modules/portal/crm/entity-fields/lib/member-field-values";
import {
    CrmSearchRepository,
    MemberSearchHit,
    OrderSearchHit,
    ProductSearchHit,
} from "@modules/portal/crm/search/domain/repositories/crm-search-repository.interface";

/** Поля участника, по которым ищем: имя, фамилия, телефон. */
const MEMBER_SEARCH_FIELDS: string[] = [
    MEMBER_FIELD_KEYS.FIRST_NAME,
    MEMBER_FIELD_KEYS.LAST_NAME,
    MEMBER_FIELD_KEYS.PHONE,
];

/** `%` и `_` в запросе — обычные символы, а не шаблоны LIKE. */
const containsPattern = (query: string) => `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

const NAME_FIELDS: string[] = [MEMBER_FIELD_KEYS.FIRST_NAME, MEMBER_FIELD_KEYS.LAST_NAME];

const nameFieldsInclude = {
    fieldValues: {
        where: { fieldDefinition: { fieldKey: { in: NAME_FIELDS } } },
        select: { valueJson: true, fieldDefinition: { select: { fieldKey: true } } },
    },
} satisfies Prisma.EntityRecordSelect;

const displayName = (rows: FieldRow[], fallback: string): string => {
    const { firstName, lastName } = getMemberDisplayNameParts(buildMemberFieldMap(rows));
    return [firstName, lastName].filter(Boolean).join(" ").trim() || fallback;
};

@Injectable()
export class CrmSearchPrismaRepository implements CrmSearchRepository {
    constructor(private readonly prisma: PrismaService) {}

    async searchMembers(
        portalId: string,
        query: string,
        limit: number
    ): Promise<MemberSearchHit[]> {
        const pattern = containsPattern(query);
        // Имя и телефон лежат в EAV (field_values.value_json): ищем по тексту JSON,
        // значения — параметры запроса, не конкатенация
        const ids = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
            SELECT m.id
            FROM members m
            JOIN users u ON u.id = m.user_id
            WHERE m.portal_id = ${portalId}
              AND (
                  m.membership_number ILIKE ${pattern}
                  OR u.email ILIKE ${pattern}
                  OR EXISTS (
                      SELECT 1
                      FROM field_values fv
                      JOIN field_definitions fd ON fd.id = fv.field_definition_id
                      WHERE fv.entity_record_id = m.entity_record_id
                        AND fv.portal_id = ${portalId}
                        AND fd.field_key IN (${Prisma.join(MEMBER_SEARCH_FIELDS)})
                        AND fv.value_json::text ILIKE ${pattern}
                  )
              )
            ORDER BY m.created_at DESC
            LIMIT ${limit}
        `);
        if (ids.length === 0) {
            return [];
        }

        const members = await this.prisma.member.findMany({
            where: { id: { in: ids.map((row) => row.id) }, portalId },
            select: {
                id: true,
                membershipNumber: true,
                user: { select: { email: true } },
                profile: { select: nameFieldsInclude },
            },
        });
        const byId = new Map(members.map((member) => [member.id, member]));
        return ids.flatMap(({ id }) => {
            const member = byId.get(id);
            if (!member) return [];
            return [
                {
                    id: member.id,
                    name: displayName(member.profile.fieldValues, member.user.email),
                    membershipNumber: member.membershipNumber,
                    email: member.user.email,
                },
            ];
        });
    }

    async searchProducts(
        portalId: string,
        query: string,
        limit: number
    ): Promise<ProductSearchHit[]> {
        return this.prisma.product.findMany({
            where: {
                portalId,
                OR: [
                    { name: { contains: query, mode: "insensitive" } },
                    { sku: { contains: query, mode: "insensitive" } },
                ],
            },
            select: { id: true, name: true, sku: true },
            orderBy: { name: "asc" },
            take: limit,
        });
    }

    async searchOrders(portalId: string, query: string, limit: number): Promise<OrderSearchHit[]> {
        const orders = await this.prisma.order.findMany({
            where: { portalId, orderNumber: { contains: query, mode: "insensitive" } },
            select: {
                id: true,
                orderNumber: true,
                orderedAt: true,
                member: {
                    select: {
                        user: { select: { email: true } },
                        profile: { select: nameFieldsInclude },
                    },
                },
            },
            orderBy: { orderedAt: "desc" },
            take: limit,
        });
        return orders.map((order) => ({
            id: order.id,
            orderNumber: order.orderNumber,
            orderedAt: order.orderedAt,
            memberName: displayName(order.member.profile.fieldValues, order.member.user.email),
        }));
    }
}
