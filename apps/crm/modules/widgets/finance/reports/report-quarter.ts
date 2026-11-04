import type { Quarter, QuarterRef } from "@/modules/entities/finance";

const MONTHS_IN_QUARTER = 3;
const QUARTERS_IN_YEAR = 4;
/** Сколько кварталов назад можно выбрать: два года — срок, за который gestor обычно спрашивает */
export const SELECTABLE_QUARTERS = 8;

const pad = (value: number): string => String(value).padStart(2, "0");

const asQuarter = (value: number): Quarter =>
    value === 1 || value === 2 || value === 3 ? value : 4;

/** Текущий квартал по часам устройства. */
export const currentQuarter = (now = new Date()): QuarterRef => ({
    year: now.getFullYear(),
    quarter: asQuarter(Math.floor(now.getMonth() / MONTHS_IN_QUARTER) + 1),
});

/** Квартал → первый и последний день: граница выборки проводок. */
export const quarterRange = ({ year, quarter }: QuarterRef): { from: string; to: string } => {
    const lastMonth = quarter * MONTHS_IN_QUARTER;
    const lastDay = new Date(Date.UTC(year, lastMonth, 0)).getUTCDate();
    return {
        from: `${year}-${pad(lastMonth - MONTHS_IN_QUARTER + 1)}-01`,
        to: `${year}-${pad(lastMonth)}-${pad(lastDay)}`,
    };
};

/** Текущий и прошлые кварталы, новые сверху. */
export const recentQuarters = (count = SELECTABLE_QUARTERS, now = new Date()): QuarterRef[] => {
    const start = currentQuarter(now);
    let index = start.year * QUARTERS_IN_YEAR + start.quarter - 1;
    const quarters: QuarterRef[] = [];
    for (let step = 0; step < count; step += 1, index -= 1) {
        quarters.push({
            year: Math.floor(index / QUARTERS_IN_YEAR),
            quarter: asQuarter((index % QUARTERS_IN_YEAR) + 1),
        });
    }
    return quarters;
};

export const quarterKey = ({ year, quarter }: QuarterRef): string => `${year}-Q${quarter}`;

export const parseQuarterKey = (key: string): QuarterRef | null => {
    const match = /^(\d{4})-Q([1-4])$/.exec(key);
    return match ? { year: Number(match[1]), quarter: asQuarter(Number(match[2])) } : null;
};
