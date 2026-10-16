import { Injectable, Logger } from "@nestjs/common";

import { DEFAULT_PRESENCE_SETTINGS, type PresenceSettings } from "../../domain/presence-settings";
import { PresenceSettingsRepository } from "../../domain/repositories/presence-settings-repository.interface";

/** Правила присутствия клуба и авто-выход забытых визитов по ним. */
@Injectable()
export class PresenceSettingsService {
    private readonly logger = new Logger(PresenceSettingsService.name);

    constructor(private readonly repository: PresenceSettingsRepository) {}

    async get(portalId: string): Promise<PresenceSettings> {
        return (await this.repository.find(portalId)) ?? DEFAULT_PRESENCE_SETTINGS;
    }

    /**
     * Названные поля меняются, остальные остаются как были. Слияние по полям, а не спредом:
     * в DTO не присланное поле существует со значением `undefined` и затёрло бы сохранённое,
     * а `maxSessionHours: null` — осознанное «без потолка».
     */
    async update(portalId: string, patch: Partial<PresenceSettings>): Promise<PresenceSettings> {
        const current = await this.get(portalId);
        return this.repository.save(portalId, {
            timezone: patch.timezone ?? current.timezone,
            autoExitTime: patch.autoExitTime ?? current.autoExitTime,
            maxSessionHours:
                patch.maxSessionHours === undefined
                    ? current.maxSessionHours
                    : patch.maxSessionHours,
        });
    }

    /**
     * Закрыть визиты, которым пора по правилам их клубов. Крон зовёт часто, каждый раз
     * закрываются только наступившие: клубы в разных часовых поясах получают авто-выход в своё время.
     */
    async closeDueSessions(now = new Date()): Promise<number> {
        const closed = await this.repository.closeDueSessions(now);
        if (closed > 0) this.logger.log(`⏰ Авто-выход: закрыто визитов — ${closed}`);
        return closed;
    }
}
