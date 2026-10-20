export const LABEL_FORMATS = ["a4", "tape"] as const;
export type LabelFormat = (typeof LABEL_FORMATS)[number];

/** Сколько товаров и копий за раз: лист печатается из браузера одним заходом */
export const LABEL_LIMITS = { products: 60, copies: 50 } as const;

export interface LabelRequest {
    ids: string[];
    format: LabelFormat;
    copies: number;
}

const isFormat = (value: string | undefined): value is LabelFormat =>
    LABEL_FORMATS.some((format) => format === value);

/** Адрес листа этикеток: какие товары, формат и сколько копий каждого. */
export const labelsQuery = (ids: readonly string[], format: LabelFormat = "a4"): string =>
    `?${new URLSearchParams({ ids: ids.join(","), format }).toString()}`;

type SearchValue = string | string[] | undefined;

const first = (value: SearchValue): string | undefined => (Array.isArray(value) ? value[0] : value);

/** Параметры листа из адреса: лишние товары и копии отрезаются по `LABEL_LIMITS`. */
export const parseLabelRequest = (params: {
    ids?: SearchValue;
    format?: SearchValue;
    copies?: SearchValue;
}): LabelRequest => {
    const copies = Math.trunc(Number(first(params.copies)));
    const format = first(params.format);
    return {
        ids: (first(params.ids) ?? "").split(",").filter(Boolean).slice(0, LABEL_LIMITS.products),
        format: isFormat(format) ? format : "a4",
        copies: Number.isFinite(copies) ? Math.min(Math.max(copies, 1), LABEL_LIMITS.copies) : 1,
    };
};
