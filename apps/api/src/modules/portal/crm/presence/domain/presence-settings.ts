/** Правила присутствия клуба (TASK-714): когда закрываются забытые визиты. */
export interface PresenceSettings {
    /** IANA, например `Europe/Madrid`: в нём считается время авто-выхода */
    timezone: string;
    /** Ежедневный авто-выход, `HH:MM` по часовому поясу клуба */
    autoExitTime: string;
    /** Визит длиннее этого числа часов закрывается сам; `null` — без потолка */
    maxSessionHours: number | null;
}

/**
 * Клуб, который ничего не настраивал, работает как раньше работал общий крон: Испания, 03:00,
 * без потолка длительности.
 */
export const DEFAULT_PRESENCE_SETTINGS: PresenceSettings = {
    timezone: "Europe/Madrid",
    autoExitTime: "03:00",
    maxSessionHours: null,
};

export const AUTO_EXIT_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export const MAX_SESSION_HOURS = { min: 1, max: 48 } as const;
