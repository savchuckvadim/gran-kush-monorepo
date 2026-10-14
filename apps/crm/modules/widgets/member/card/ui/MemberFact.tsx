"use client";

import { useTranslations } from "next-intl";

import { cn } from "@workspace/ui/lib/utils";

interface MemberFactProps {
    label: string;
    value: string | null | undefined;
    mono?: boolean;
}

/** One line of the profile; an empty value says so quietly instead of a dash. */
export function MemberFact({ label, value, mono = false }: MemberFactProps) {
    const t = useTranslations("crm.members.card.profile");

    return (
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3 text-sm">
            <dt className="truncate text-muted-foreground">{label}</dt>
            <dd
                className={cn(
                    "min-w-0 break-words",
                    mono && value && "font-mono",
                    !value && "text-muted-foreground/60 italic"
                )}
            >
                {value || t("empty")}
            </dd>
        </div>
    );
}
