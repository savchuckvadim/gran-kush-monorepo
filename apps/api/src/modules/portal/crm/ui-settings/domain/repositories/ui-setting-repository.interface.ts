import type { Prisma } from "@prisma/client";

import type { UiSettingKey } from "../ui-setting-keys";

/** Настройка клуба и личная настройка сотрудника по одному ключу. */
export interface UiSettingPair {
    /** Настройка клуба; `null` — клуб её не задавал */
    portal: Prisma.JsonValue | null;
    /** Личная настройка сотрудника поверх клубной; `null` — своей нет */
    employee: Prisma.JsonValue | null;
}

export abstract class UiSettingRepository {
    /** Клубная и личная настройки одним запросом */
    abstract find(input: {
        portalId: string;
        employeeId: string;
        key: UiSettingKey;
    }): Promise<UiSettingPair>;

    /**
     * Записать настройку. `employeeId: null` — клубная (её меняет manager+), иначе личная.
     * `value: null` — убрать настройку: личная вернётся к клубной, клубная — к умолчанию клиента.
     */
    abstract save(input: {
        portalId: string;
        employeeId: string | null;
        key: UiSettingKey;
        value: Prisma.InputJsonValue | null;
    }): Promise<void>;
}
