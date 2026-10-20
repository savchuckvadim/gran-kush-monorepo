import type { Permission } from "@/modules/entities/access";

/** Сканер в шапке — тем, кому есть что делать с кодом: стойка, заказ, склад или карточки. */
export const SCANNER_PERMISSIONS: readonly Permission[] = [
    "presence.checkin",
    "orders.create",
    "catalog.manage",
    "members.read",
];
