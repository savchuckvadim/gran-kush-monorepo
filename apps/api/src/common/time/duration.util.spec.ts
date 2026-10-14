import { parseDurationToMs } from "./duration.util";

describe("parseDurationToMs", () => {
    const FALLBACK = 123;

    it.each([
        ["30s", 30_000],
        ["15m", 900_000],
        ["24h", 86_400_000],
        ["7d", 604_800_000],
        [" 7d ", 604_800_000],
    ])("парсит %s", (value, expected) => {
        expect(parseDurationToMs(value, FALLBACK)).toBe(expected);
    });

    it.each(["", "7", "d", "7w", "7 d", "-7d"])("непонятное %p — fallback", (value) => {
        expect(parseDurationToMs(value, FALLBACK)).toBe(FALLBACK);
    });
});
