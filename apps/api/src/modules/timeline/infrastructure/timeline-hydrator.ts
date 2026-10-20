import { Injectable } from "@nestjs/common";

import type { Prisma } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import { PERSON_NAME_SELECT, personName } from "@modules/portal/crm/entity-fields/lib/person-name";

import type { TimelineSubjectKind } from "../domain/timeline";

export interface EventLabel {
    label: string;
    labelI18n: Prisma.JsonValue;
}

/** Ключ предмета в карте подписей. */
export const subjectKey = (kind: string, id: string): string => `${kind}:${id}`;

/**
 * Подписи к записям таймлайна при чтении — только своего клуба: имена сотрудников и участников,
 * номера заказов, названия товаров, стадии заказов и статусы участников словами клуба.
 */
@Injectable()
export class TimelineHydrator {
    constructor(private readonly prisma: PrismaService) {}

    async staffNames(portalId: string, ids: readonly string[]): Promise<Map<string, string>> {
        if (!ids.length) return new Map();
        const rows = await this.prisma.employee.findMany({
            where: { portalId, id: { in: [...ids] } },
            select: PERSON_NAME_SELECT,
        });
        return new Map(rows.map((row) => [row.id, personName(row)]));
    }

    /** Подписи стадий заказа и статусов участника по id. */
    async eventLabels(
        portalId: string,
        stageIds: readonly string[],
        statusIds: readonly string[]
    ): Promise<Map<string, EventLabel>> {
        const [stages, statuses] = await Promise.all([
            stageIds.length
                ? this.prisma.stage.findMany({
                      where: { id: { in: [...stageIds] }, stageCategory: { portalId } },
                      select: { id: true, name: true, nameI18n: true },
                  })
                : Promise.resolve([]),
            statusIds.length
                ? this.prisma.statusItem.findMany({
                      where: { id: { in: [...statusIds] }, statusSet: { portalId } },
                      select: { id: true, label: true, labelI18n: true },
                  })
                : Promise.resolve([]),
        ]);
        const labels = new Map<string, EventLabel>();
        for (const stage of stages) {
            labels.set(stage.id, { label: stage.name, labelI18n: stage.nameI18n });
        }
        for (const status of statuses) {
            labels.set(status.id, { label: status.label, labelI18n: status.labelI18n });
        }
        return labels;
    }

    /** Слова для ссылок ленты: номер заказа, имя участника и сотрудника, название товара. */
    async subjectLabels(
        portalId: string,
        refs: readonly { kind: TimelineSubjectKind; id: string }[]
    ): Promise<Map<string, string>> {
        const ids = (kind: TimelineSubjectKind) => [
            ...new Set(refs.filter((ref) => ref.kind === kind).map((ref) => ref.id)),
        ];
        const [orders, members, staff, products] = await Promise.all([
            ids("order").length
                ? this.prisma.order.findMany({
                      where: { portalId, id: { in: ids("order") } },
                      select: { id: true, orderNumber: true },
                  })
                : Promise.resolve([]),
            ids("member").length
                ? this.prisma.member.findMany({
                      where: { portalId, id: { in: ids("member") } },
                      select: PERSON_NAME_SELECT,
                  })
                : Promise.resolve([]),
            this.staffNames(portalId, ids("employee")),
            ids("product").length
                ? this.prisma.product.findMany({
                      where: { portalId, id: { in: ids("product") } },
                      select: { id: true, name: true },
                  })
                : Promise.resolve([]),
        ]);
        const labels = new Map<string, string>();
        for (const order of orders) labels.set(subjectKey("order", order.id), order.orderNumber);
        for (const member of members)
            labels.set(subjectKey("member", member.id), personName(member));
        for (const [id, name] of staff) labels.set(subjectKey("employee", id), name);
        for (const product of products) labels.set(subjectKey("product", product.id), product.name);
        return labels;
    }
}
