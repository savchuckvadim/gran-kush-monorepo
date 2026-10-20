import type { SoldLine } from "./margin";

/** Проданные строки заказов за период — для отчёта по марже. */
export abstract class SoldLinesSource {
    abstract soldBetween(portalId: string, from: Date, to: Date): Promise<SoldLine[]>;
}
