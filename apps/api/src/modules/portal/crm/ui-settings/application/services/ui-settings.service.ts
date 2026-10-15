import { Injectable, Logger } from "@nestjs/common";

import type { Prisma } from "@prisma/client";

import { RedisService } from "@common/redis/redis.service";
import {
    UiSettingPair,
    UiSettingRepository,
} from "@modules/portal/crm/ui-settings/domain/repositories/ui-setting-repository.interface";
import type { UiSettingKey } from "@modules/portal/crm/ui-settings/domain/ui-setting-keys";

/** Настройки меняются редко и читаются на каждом открытии доски — час кеша безопасен. */
const CACHE_TTL_SECONDS = 60 * 60;

const cacheKey = (portalId: string, employeeId: string, key: UiSettingKey): string =>
    `ui-settings:${portalId}:${employeeId}:${key}`;

/**
 * Настройки интерфейса: клубная и личная по одному ключу. Клиент сам решает, что делать с
 * парой — обычно берёт личную, иначе клубную, иначе свои умолчания.
 *
 * Кеш в Redis только ускоряет чтение: его недоступность не должна ронять CRM, поэтому любая
 * ошибка Redis логируется и чтение идёт в базу.
 */
@Injectable()
export class UiSettingsService {
    private readonly logger = new Logger(UiSettingsService.name);

    constructor(
        private readonly repository: UiSettingRepository,
        private readonly redis: RedisService
    ) {}

    async get(portalId: string, employeeId: string, key: UiSettingKey): Promise<UiSettingPair> {
        const cached = await this.readCache(portalId, employeeId, key);
        if (cached) return cached;

        const pair = await this.repository.find({ portalId, employeeId, key });
        await this.writeCache(portalId, employeeId, key, pair);
        return pair;
    }

    /**
     * Сохранить настройку. `employeeId: null` — клубная, её право проверяет контроллер.
     * `value: null` — сбросить: личная вернётся к клубной, клубная — к умолчанию клиента.
     */
    async save(input: {
        portalId: string;
        employeeId: string | null;
        key: UiSettingKey;
        value: Prisma.InputJsonValue | null;
        /** Чей кеш сбросить: сотрудник, сделавший запрос */
        actorEmployeeId: string;
    }): Promise<UiSettingPair> {
        await this.repository.save(input);

        // клубную настройку видят все сотрудники — у каждого свой ключ кеша, чистим скопом
        await (input.employeeId === null
            ? this.dropPortalCache(input.portalId, input.key)
            : this.dropCache(input.portalId, input.actorEmployeeId, input.key));

        return this.get(input.portalId, input.actorEmployeeId, input.key);
    }

    // ─── Кеш ─────────────────────────────────────────────────────────────────

    private async readCache(
        portalId: string,
        employeeId: string,
        key: UiSettingKey
    ): Promise<UiSettingPair | null> {
        try {
            const raw = await this.redis.getClient().get(cacheKey(portalId, employeeId, key));
            return raw ? (JSON.parse(raw) as UiSettingPair) : null;
        } catch (error) {
            this.warn("чтение", error);
            return null;
        }
    }

    private async writeCache(
        portalId: string,
        employeeId: string,
        key: UiSettingKey,
        pair: UiSettingPair
    ): Promise<void> {
        try {
            await this.redis
                .getClient()
                .set(
                    cacheKey(portalId, employeeId, key),
                    JSON.stringify(pair),
                    "EX",
                    CACHE_TTL_SECONDS
                );
        } catch (error) {
            this.warn("запись", error);
        }
    }

    private async dropCache(
        portalId: string,
        employeeId: string,
        key: UiSettingKey
    ): Promise<void> {
        try {
            await this.redis.getClient().del(cacheKey(portalId, employeeId, key));
        } catch (error) {
            this.warn("сброс", error);
        }
    }

    /** Клубная настройка лежит в кеше каждого сотрудника портала — чистим по маске. */
    private async dropPortalCache(portalId: string, key: UiSettingKey): Promise<void> {
        try {
            const client = this.redis.getClient();
            const pattern = `ui-settings:${portalId}:*:${key}`;
            let cursor = "0";
            do {
                const [next, keys] = await client.scan(cursor, "MATCH", pattern, "COUNT", 200);
                cursor = next;
                if (keys.length > 0) await client.del(...keys);
            } while (cursor !== "0");
        } catch (error) {
            this.warn("сброс по порталу", error);
        }
    }

    private warn(what: string, error: unknown): void {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Кеш настроек недоступен (${what}): ${message}`);
    }
}
