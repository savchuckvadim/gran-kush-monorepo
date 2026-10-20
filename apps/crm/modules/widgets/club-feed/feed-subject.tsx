"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { ROUTES } from "@/modules/shared/config/routes";
import { useOpenEntity } from "@/modules/shared/lib/entity-slider";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

export interface FeedSubjectRef {
    kind: string;
    id: string;
    label: string | null;
}

/** К кому или чему запись ленты: участник, заказ, сотрудник — в слайдере, товар — страницей. */
export function FeedSubject({ subject }: { subject: FeedSubjectRef }) {
    const t = useTranslations("crm.feed.subjects");
    const openEntity = useOpenEntity();
    const router = useRouter();
    const link = useLocalizedLink();
    if (subject.kind === "portal") return null;

    const open = () => {
        if (subject.kind === "member" || subject.kind === "order" || subject.kind === "employee") {
            openEntity({ kind: subject.kind, id: subject.id });
        } else if (subject.kind === "product") {
            router.push(link(`${ROUTES.CRM_PRODUCT_DETAILS}/${subject.id}`));
        }
    };

    return (
        <button
            type="button"
            onClick={open}
            className="w-fit truncate text-left text-xs font-medium text-primary hover:underline"
        >
            {subject.label || t(subject.kind)}
        </button>
    );
}
