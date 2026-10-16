import type { PresenceSettings } from "../presence-settings";

export abstract class PresenceSettingsRepository {
    /** Сохранённые правила клуба; `null` — клуб работает по умолчанию. */
    abstract find(portalId: string): Promise<PresenceSettings | null>;

    abstract save(portalId: string, settings: PresenceSettings): Promise<PresenceSettings>;

    /**
     * Закрыть визиты, которым пора: начатые до последнего авто-выхода клуба (по его часовому
     * поясу) или длиннее его потолка. Время выхода — момент правила, а не момент запуска крона.
     * Возвращает число закрытых.
     */
    abstract closeDueSessions(now: Date): Promise<number>;
}
