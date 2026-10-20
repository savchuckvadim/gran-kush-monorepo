/** Местная дата ISO-времени: записи одного дня — под одним заголовком. */
const dayKey = (iso: string): string => {
    const date = new Date(iso);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
};

export interface TimelineDay<T> {
    day: string;
    items: T[];
}

/** Записи уже отсортированы от новых к старым — режем на дни, не меняя порядок. */
export const groupByDay = <T extends { at: string }>(items: readonly T[]): TimelineDay<T>[] => {
    const days: TimelineDay<T>[] = [];
    for (const item of items) {
        const day = dayKey(item.at);
        const last = days.at(-1);
        if (last?.day === day) last.items.push(item);
        else days.push({ day, items: [item] });
    }
    return days;
};

/** «Сегодня», «вчера» или ничего — тогда заголовком будет дата. */
export const relativeDay = (day: string, now = new Date()): "today" | "yesterday" | null => {
    if (day === dayKey(now.toISOString())) return "today";
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    return day === dayKey(yesterday.toISOString()) ? "yesterday" : null;
};
