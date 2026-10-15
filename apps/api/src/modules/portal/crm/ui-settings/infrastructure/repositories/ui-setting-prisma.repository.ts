import { Injectable } from "@nestjs/common";

import { Prisma } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import {
    UiSettingPair,
    UiSettingRepository,
} from "@modules/portal/crm/ui-settings/domain/repositories/ui-setting-repository.interface";
import type { UiSettingKey } from "@modules/portal/crm/ui-settings/domain/ui-setting-keys";

@Injectable()
export class UiSettingPrismaRepository extends UiSettingRepository {
    constructor(private readonly prisma: PrismaService) {
        super();
    }

    async find(input: {
        portalId: string;
        employeeId: string;
        key: UiSettingKey;
    }): Promise<UiSettingPair> {
        const rows = await this.prisma.uiSetting.findMany({
            where: {
                portalId: input.portalId,
                key: input.key,
                OR: [{ employeeId: null }, { employeeId: input.employeeId }],
            },
            select: { employeeId: true, value: true },
        });

        return {
            portal: rows.find((row) => row.employeeId === null)?.value ?? null,
            employee: rows.find((row) => row.employeeId !== null)?.value ?? null,
        };
    }

    /**
     * Запись настройки. `employeeId: null` — клубная: у неё в уникальном индексе NULL, который
     * в Postgres не равен сам себе, поэтому upsert по составному ключу её не находит —
     * обновляем по `updateMany` и вставляем, только если строки ещё нет.
     */
    async save(input: {
        portalId: string;
        employeeId: string | null;
        key: UiSettingKey;
        value: Prisma.InputJsonValue | null;
    }): Promise<void> {
        const where = {
            portalId: input.portalId,
            employeeId: input.employeeId,
            key: input.key,
        };

        if (input.value === null) {
            await this.prisma.uiSetting.deleteMany({ where });
            return;
        }

        const value = input.value;
        try {
            const { count } = await this.prisma.uiSetting.updateMany({ where, data: { value } });
            if (count === 0) await this.prisma.uiSetting.create({ data: { ...where, value } });
        } catch (error) {
            // гонка двух сохранений: строку успели создать — наш апдейт поверх неё
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
                await this.prisma.uiSetting.updateMany({ where, data: { value } });
                return;
            }
            throw error;
        }
    }
}
