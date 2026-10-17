"use client";

import { useTranslations } from "next-intl";

import { cn } from "@workspace/ui/lib/utils";

interface FactProps {
    label: string;
    value: string | null | undefined;
    mono?: boolean;
}

/**
 * Строка профиля в карточке (участник, сотрудник): подпись и значение. Пустое значение
 * так и подписано — тихо, курсивом, а не прочерком. Строки собирает {@link FactGroup}.
 */
export function Fact({ label, value, mono = false }: FactProps) {
    const t = useTranslations("crm.fact");

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
