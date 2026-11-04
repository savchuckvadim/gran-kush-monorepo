export const QUARTERS = [1, 2, 3, 4] as const;
export type Quarter = (typeof QUARTERS)[number];

const MONTHS_IN_QUARTER = 3;

/** Квартал налогового периода: даты включительно, `YYYY-MM-DD`. */
export interface QuarterPeriod {
    year: number;
    quarter: Quarter;
    from: string;
    to: string;
}

const pad = (value: number): string => String(value).padStart(2, "0");

const lastDayOf = (year: number, month: number): number =>
    new Date(Date.UTC(year, month, 0)).getUTCDate();

export const quarterPeriod = (year: number, quarter: Quarter): QuarterPeriod => {
    const firstMonth = (quarter - 1) * MONTHS_IN_QUARTER + 1;
    const lastMonth = firstMonth + MONTHS_IN_QUARTER - 1;
    return {
        year,
        quarter,
        from: `${year}-${pad(firstMonth)}-01`,
        to: `${year}-${pad(lastMonth)}-${pad(lastDayOf(year, lastMonth))}`,
    };
};

/** Начало года периода: формы IRPF считаются нарастающим итогом с 1 января. */
export const yearStartOf = (period: Pick<QuarterPeriod, "year">): string => `${period.year}-01-01`;

/** Дата `YYYY-MM-DD` внутри периода включительно. */
export const isWithin = (date: string, from: string, to: string): boolean =>
    date >= from && date <= to;
