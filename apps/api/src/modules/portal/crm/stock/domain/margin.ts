/** Строка проданного товара за период в центах: выручка без налога и себестоимость. */
export interface SoldLine {
    productId: string;
    productName: string;
    categoryId: string;
    categoryName: string;
    quantity: number;
    revenue: number;
    cost: number | null;
}

export interface MarginRow {
    productId: string;
    productName: string;
    categoryId: string;
    categoryName: string;
    quantity: number;
    /** Выручка без налога, центы */
    revenue: number;
    /** Себестоимость проданного, центы; `null` — у части строк поставок не было */
    cost: number | null;
    margin: number | null;
    /** Маржа в процентах от выручки; `null` — выручки или себестоимости нет */
    marginPercent: number | null;
}

export interface MarginReport {
    revenue: number;
    cost: number;
    margin: number;
    /** Выручка строк без себестоимости — её маржа неизвестна */
    revenueWithoutCost: number;
    byProduct: MarginRow[];
}

const sum = <T>(items: readonly T[], pick: (item: T) => number): number =>
    items.reduce((total, item) => total + pick(item), 0);

const percent = (margin: number, revenue: number): number | null =>
    revenue > 0 ? Math.round((margin / revenue) * 1000) / 10 : null;

/**
 * Маржа периода по товарам: выручка без налога минус себестоимость на момент продажи. Строки без
 * себестоимости (товар заведён до поставок) в маржу не входят и показаны отдельно, чтобы итог не
 * врал. Самые прибыльные сверху, убыточные снизу — «что ест маржу».
 */
export const marginReport = (lines: readonly SoldLine[]): MarginReport => {
    const byProduct = new Map<string, MarginRow>();
    for (const line of lines) {
        const row = byProduct.get(line.productId) ?? {
            productId: line.productId,
            productName: line.productName,
            categoryId: line.categoryId,
            categoryName: line.categoryName,
            quantity: 0,
            revenue: 0,
            cost: 0,
            margin: null,
            marginPercent: null,
        };
        row.quantity += line.quantity;
        row.revenue += line.revenue;
        row.cost = row.cost === null || line.cost === null ? null : row.cost + line.cost;
        byProduct.set(line.productId, row);
    }
    const rows = [...byProduct.values()].map((row) => {
        const margin = row.cost === null ? null : row.revenue - row.cost;
        return {
            ...row,
            margin,
            marginPercent: margin === null ? null : percent(margin, row.revenue),
        };
    });
    rows.sort(
        (a, b) => (b.margin ?? Number.NEGATIVE_INFINITY) - (a.margin ?? Number.NEGATIVE_INFINITY)
    );
    const priced = rows.filter((row) => row.cost !== null);
    const revenue = sum(priced, (row) => row.revenue);
    const cost = sum(priced, (row) => row.cost ?? 0);
    return {
        revenue,
        cost,
        margin: revenue - cost,
        revenueWithoutCost: sum(
            rows.filter((row) => row.cost === null),
            (row) => row.revenue
        ),
        byProduct: rows,
    };
};
