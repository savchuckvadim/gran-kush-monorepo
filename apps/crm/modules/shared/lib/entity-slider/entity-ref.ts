import { ROUTES } from "@/modules/shared/config/routes";

/** What can open in a slider. Products and smart-process records stay pages for now. */
export type EntityKind = "member" | "order";

export interface EntityRef {
    kind: EntityKind;
    id: string;
}

const DETAILS_ROUTE: Record<EntityKind, string> = {
    member: ROUTES.CRM_MEMBER_DETAILS,
    order: ROUTES.CRM_ORDER_DETAILS,
};

export const isEntityKind = (value: unknown): value is EntityKind =>
    value === "member" || value === "order";

/** The entity's own page without locale and club: `useLocalizedLink` adds them. */
export const entityPath = ({ kind, id }: EntityRef): string => `${DETAILS_ROUTE[kind]}/${id}`;

/** Sliders open from the Tailwind `lg` width; a phone gets the ordinary page, as in Bitrix24. */
export const SLIDER_MEDIA = "(min-width: 1024px)";

export const canSlide = (): boolean =>
    typeof window !== "undefined" && window.matchMedia(SLIDER_MEDIA).matches;
