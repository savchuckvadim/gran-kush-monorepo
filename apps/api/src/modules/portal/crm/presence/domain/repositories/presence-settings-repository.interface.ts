import type { EventsOf } from "@modules/events";

import type { PresenceSettings } from "../presence-settings";

/** Визит, закрытый авто-выходом */
export interface ClosedPresenceSession {
    sessionId: string;
    portalId: string;
    memberId: string;
}

export abstract class PresenceSettingsRepository {
    /** Сохранённые правила клуба; `null` — клуб работает по умолчанию. */
    abstract find(portalId: string): Promise<PresenceSettings | null>;

    abstract save(portalId: string, settings: PresenceSettings): Promise<PresenceSettings>;

    /**
     * Закрыть визиты, которым пора: начатые до последнего авто-выхода клуба (по его часовому
     * поясу) или длиннее его потолка. Время выхода — момент правила, а не момент запуска крона.
     * Возвращает число закрытых; `events` по закрытым визитам пишутся той же транзакцией.
     */
    abstract closeDueSessions(
        now: Date,
        events?: EventsOf<readonly ClosedPresenceSession[]>
    ): Promise<number>;
}
