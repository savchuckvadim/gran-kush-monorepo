import { ROUTES } from "@/modules/shared/config/routes";

/** What can open in a slider. Smart-process records stay pages for now. */
export type EntityKind = "member" | "order" | "employee" | "product" | "newOrder";

export interface EntityRef {
    kind: EntityKind;
    id: string;
}

const DETAILS_ROUTE: Record<EntityKind, string> = {
    member: ROUTES.CRM_MEMBER_DETAILS,
    order: ROUTES.CRM_ORDER_DETAILS,
    employee: ROUTES.CRM_EMPLOYEE_DETAILS,
    product: ROUTES.CRM_PRODUCT_DETAILS,
    newOrder: ROUTES.CRM_ORDER_NEW,
};

/** Every kind has its page, so the list of pages is the list of kinds. */
export const isEntityKind = (value: unknown): value is EntityKind =>
    typeof value === "string" && Object.hasOwn(DETAILS_ROUTE, value);

/**
 * The entity's own page without locale and club: `useLocalizedLink` adds them. A new order's `id`
 * is its prefill as a query string (`memberId=…`), so its page opens with the same draft.
 */
export const entityPath = ({ kind, id }: EntityRef): string =>
    kind === "newOrder"
        ? `${DETAILS_ROUTE.newOrder}${id ? `?${id}` : ""}`
        : `${DETAILS_ROUTE[kind]}/${id}`;

export interface NewOrderPrefill {
    memberId?: string;
    productId?: string;
}

/** A new order for a member or with a product: the member card, the scanner. */
export const newOrderRef = (prefill: NewOrderPrefill = {}): EntityRef => {
    const query = new URLSearchParams();
    if (prefill.memberId) query.set("memberId", prefill.memberId);
    if (prefill.productId) query.set("productId", prefill.productId);
    return { kind: "newOrder", id: query.toString() };
};

export const newOrderPrefill = (id: string): NewOrderPrefill => {
    const query = new URLSearchParams(id);
    return {
        memberId: query.get("memberId") ?? undefined,
        productId: query.get("productId") ?? undefined,
    };
};

/** Sliders open from the Tailwind `lg` width; a phone gets the ordinary page, as in Bitrix24. */
export const SLIDER_MEDIA = "(min-width: 1024px)";

export const canSlide = (): boolean =>
    typeof window !== "undefined" && window.matchMedia(SLIDER_MEDIA).matches;
