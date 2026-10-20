/** Месяц `YYYY-MM` → первый и последний день: граница выборки проводок. */
export const monthRange = (month: string): { from: string; to: string } => {
    const [year, index] = month.split("-").map(Number);
    const last = new Date(Date.UTC(year ?? 0, index ?? 1, 0)).getUTCDate();
    return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
};

/** Текущий месяц по часам устройства. */
export const currentMonth = (now = new Date()): string =>
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

/** «Октябрь 2026 г.»: месяц словом, с заглавной буквы в языке интерфейса. */
export const monthLabel = (month: string, locale: string): string => {
    const name = new Intl.DateTimeFormat(locale, {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
    }).format(new Date(`${month}-01T00:00:00Z`));
    return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1);
};
