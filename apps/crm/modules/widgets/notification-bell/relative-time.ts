const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** «5 мин назад», «вчера», «3 дн. назад» — для ленты уведомлений; старше недели — дата. */
export const relativeTime = (iso: string, locale: string, now = Date.now()): string => {
    const diff = new Date(iso).getTime() - now;
    const format = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" });
    if (Math.abs(diff) < HOUR) return format.format(Math.round(diff / MINUTE), "minute");
    if (Math.abs(diff) < DAY) return format.format(Math.round(diff / HOUR), "hour");
    if (Math.abs(diff) < 7 * DAY) return format.format(Math.round(diff / DAY), "day");
    return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(
        new Date(iso)
    );
};
