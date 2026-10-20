/** Месяц учёта: проводка относится к месяцу своей даты операции. */
export interface FinanceMonth {
    year: number;
    month: number;
}

/** Состояние месяца: строки нет — месяц открыт. */
export interface FinancePeriodState extends FinanceMonth {
    closedAt: Date | null;
    closedById: string | null;
}

/** `2026-10-05` → `{ year: 2026, month: 10 }`. */
export const monthOf = (date: string): FinanceMonth => ({
    year: Number(date.slice(0, 4)),
    month: Number(date.slice(5, 7)),
});

/** `{ 2026, 10 }` → `2026-10`: месяц в событиях и в CRM. */
export const monthKey = ({ year, month }: FinanceMonth): string =>
    `${year}-${String(month).padStart(2, "0")}`;

const ordinal = ({ year, month }: FinanceMonth): number => year * 12 + month;

/** Закрыть можно только прошедший месяц: текущий ещё пишется, в него ложатся сторно и автопроводки. */
export const isPastMonth = (month: FinanceMonth, today: string): boolean =>
    ordinal(month) < ordinal(monthOf(today));

/** Первый и последний день месяца — границы выборки проводок. */
export const monthRange = (month: FinanceMonth): { from: string; to: string } => {
    const last = new Date(Date.UTC(month.year, month.month, 0)).getUTCDate();
    const key = monthKey(month);
    return { from: `${key}-01`, to: `${key}-${String(last).padStart(2, "0")}` };
};

/** Календарная дата момента в часовом поясе клуба: оплата в 00:30 по Мадриду — уже новый день. */
export const localDate = (at: Date, timeZone: string): string =>
    new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(at);

/** Квартал для книг и форм: `1T`…`4T`. */
export const quarterOf = (date: string): string => `${Math.ceil(monthOf(date).month / 3)}T`;

export const PERIOD_ERRORS = {
    notPast: "period_not_past",
    alreadyClosed: "period_already_closed",
    notClosed: "period_not_closed",
} as const;
