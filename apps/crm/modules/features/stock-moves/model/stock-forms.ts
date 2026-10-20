import { z } from "zod";

import type { ProductChoice } from "@/modules/entities/product";
import type { ManualStockMoveInput, PurchaseInput } from "@/modules/entities/stock";

/** Сообщения — ключи `crm.stock.errors.*`. */
const DATE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const positive = z.number({ message: "quantity" }).positive("quantity");

export const purchaseFormSchema = z.object({
    product: z.custom<ProductChoice | null>((value) => value !== null, "product"),
    quantity: positive,
    unitCost: z.number({ message: "cost" }).min(0, "cost"),
    counterpartyId: z.string(),
    receivedOn: z.string().regex(DATE, "date"),
});
export type PurchaseFormValues = z.infer<typeof purchaseFormSchema>;

export const purchaseFormValues = (
    today: string,
    product: ProductChoice | null = null
): PurchaseFormValues => ({
    product,
    quantity: Number.NaN,
    unitCost: Number.NaN,
    counterpartyId: "",
    receivedOn: today,
});

export const toPurchaseInput = (values: PurchaseFormValues): PurchaseInput => ({
    productId: values.product?.id ?? "",
    quantity: values.quantity,
    unitCost: values.unitCost,
    counterpartyId: values.counterpartyId || null,
    receivedOn: values.receivedOn,
});

export const stockMoveFormSchema = z.object({
    product: z.custom<ProductChoice | null>((value) => value !== null, "product"),
    reason: z.enum(["write_off", "gift", "recount"]),
    quantity: positive,
    /** Пересчёт: новый остаток, остальное — сколько списать */
    note: z.string().trim().min(1, "note").max(500, "tooLong"),
});
export type StockMoveFormValues = z.infer<typeof stockMoveFormSchema>;

export const stockMoveFormValues = (product: ProductChoice | null = null): StockMoveFormValues => ({
    product,
    reason: "write_off",
    quantity: Number.NaN,
    note: "",
});

/** Пересчёт вводится новым остатком, в API уходит разница со знаком. */
export const toStockMoveInput = (values: StockMoveFormValues): ManualStockMoveInput => ({
    productId: values.product?.id ?? "",
    reason: values.reason,
    quantity:
        values.reason === "recount"
            ? Math.round((values.quantity - (values.product?.currentQuantity ?? 0)) * 1000) / 1000
            : values.quantity,
    note: values.note.trim(),
});

/** Сегодня по часам устройства, `YYYY-MM-DD`. */
export const localToday = (now = new Date()): string =>
    [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0"),
    ].join("-");
