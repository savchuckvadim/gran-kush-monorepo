/** Браузер и система по User-Agent — сколько нужно, чтобы узнать своё устройство в списке. */
const BROWSERS: [RegExp, string][] = [
    [/Edg\//, "Edge"],
    [/OPR\/|Opera/, "Opera"],
    [/YaBrowser\//, "Yandex"],
    [/Firefox\//, "Firefox"],
    [/Chrome\//, "Chrome"],
    [/Safari\//, "Safari"],
];

const SYSTEMS: [RegExp, string][] = [
    [/iPhone|iPad|iPod/, "iOS"],
    [/Android/, "Android"],
    [/Windows/, "Windows"],
    [/Mac OS X|Macintosh/, "macOS"],
    [/Linux/, "Linux"],
];

const first = (agent: string, table: [RegExp, string][]): string | null =>
    table.find(([pattern]) => pattern.test(agent))?.[1] ?? null;

/** «Chrome · Windows»; неузнаваемый агент — `null`, тогда строка показывает «Неизвестное устройство». */
export const describeUserAgent = (agent: string | null): string | null => {
    if (!agent) return null;
    const parts = [first(agent, BROWSERS), first(agent, SYSTEMS)].filter(Boolean);
    return parts.length > 0 ? parts.join(" · ") : null;
};
