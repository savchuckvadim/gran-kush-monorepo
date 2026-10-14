const DURATION_REGEX = /^(\d+)([smhd])$/;

const UNIT_MS: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
};

/**
 * Длительность вида "15m" / "7d" → миллисекунды. Формат один на куки и JWT:
 * раньше TokenIssuer понимал только дни и молча превращал "24h" в 24 дня
 * жизни refresh-строки в БД.
 */
export const parseDurationToMs = (value: string, fallbackMs: number): number => {
    const parsed = DURATION_REGEX.exec(value.trim());
    if (!parsed) {
        return fallbackMs;
    }
    return Number(parsed[1]) * UNIT_MS[parsed[2]];
};
