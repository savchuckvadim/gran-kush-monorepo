import type { CreateOrderBody } from "@/modules/entities/order";

/** A product as the picker found it: enough to price a line and check the stock. */
export interface DraftProduct {
    id: string;
    name: string;
    sku?: string | null;
    price: number;
    currentQuantity: number;
    unitCode?: string;
}

/** A line being typed: numbers stay strings so that "", "0," or "1.5" can be edited freely. */
export interface OrderDraftLine {
    key: string;
    product: DraftProduct;
    quantity: string;
    unitPrice: string;
    isGift: boolean;
}

/** The member the order is placed for. */
export interface DraftMember {
    id: string;
    name: string;
    email?: string | null;
    isActive: boolean;
}

export type DraftLineError = "quantity" | "price" | "stock";

/** Same precision as the API: quantity to 3 decimals, money to 2. */
const QUANTITY_DECIMALS = 3;
const PRICE_DECIMALS = 2;

const normalize = (raw: string): string => raw.trim().replace(",", ".");

const parse = (raw: string): number => (normalize(raw) === "" ? NaN : Number(normalize(raw)));

const fitsDecimals = (raw: string, max: number): boolean =>
    (normalize(raw).split(".")[1] ?? "").length <= max;

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

let lineSeq = 0;

export const newDraftLine = (product: DraftProduct): OrderDraftLine => ({
    key: `${product.id}-${++lineSeq}`,
    product,
    quantity: "1",
    unitPrice: String(product.price),
    isGift: false,
});

export const lineQuantity = (line: OrderDraftLine): number => parse(line.quantity);

export const linePrice = (line: OrderDraftLine): number => parse(line.unitPrice);

/** What the member pays for the line: a gift is free, a half-typed number counts as zero. */
export const lineTotal = (line: OrderDraftLine): number => {
    if (line.isGift) return 0;
    const total = lineQuantity(line) * linePrice(line);
    return Number.isFinite(total) ? roundMoney(total) : 0;
};

/** What the gifts would have cost — shown next to the total, not added to it. */
export const giftsValue = (lines: readonly OrderDraftLine[]): number =>
    roundMoney(
        lines
            .filter((line) => line.isGift)
            .reduce((sum, line) => {
                const value = lineQuantity(line) * linePrice(line);
                return Number.isFinite(value) ? sum + value : sum;
            }, 0)
    );

export const draftTotal = (lines: readonly OrderDraftLine[]): number =>
    roundMoney(lines.reduce((sum, line) => sum + lineTotal(line), 0));

/** Stock is checked over every line of the product: a paid and a gift line share one shelf. */
export function draftLineError(
    line: OrderDraftLine,
    lines: readonly OrderDraftLine[]
): DraftLineError | undefined {
    const quantity = lineQuantity(line);
    if (!(quantity > 0) || !fitsDecimals(line.quantity, QUANTITY_DECIMALS)) return "quantity";

    const price = linePrice(line);
    if (!(price >= 0) || !fitsDecimals(line.unitPrice, PRICE_DECIMALS)) return "price";

    const requested = lines
        .filter((other) => other.product.id === line.product.id)
        .reduce((sum, other) => sum + (lineQuantity(other) || 0), 0);
    // 0.1 + 0.2 must not exceed a stock of 0.3
    if (Math.round(requested * 1000) / 1000 > line.product.currentQuantity) return "stock";

    return undefined;
}

/** The price is always sent: the member pays what the employee saw, even if the catalog changed. */
export const toCreateOrderBody = (draft: {
    member: DraftMember;
    lines: readonly OrderDraftLine[];
    notes: string;
    stageId?: string;
}): CreateOrderBody => ({
    memberId: draft.member.id,
    items: draft.lines.map((line) => ({
        productId: line.product.id,
        quantity: lineQuantity(line),
        unitPrice: linePrice(line),
        ...(line.isGift ? { isGift: true } : {}),
    })),
    ...(draft.notes.trim() ? { notes: draft.notes.trim() } : {}),
    ...(draft.stageId ? { stageId: draft.stageId } : {}),
});
