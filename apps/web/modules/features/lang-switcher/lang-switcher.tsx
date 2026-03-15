"use client";

import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "next-intl";

import { Globe } from "lucide-react";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select";

import { type Locale, localeNames, locales } from "@/modules/shared/config/i18n";

export function LangSwitcher() {
    const locale = useLocale() as Locale;
    const router = useRouter();
    const pathname = usePathname();

    const handleLocaleChange = (newLocale: string) => {
        // Replace locale in pathname
        const segments = pathname.split("/");
        if (segments[1] && locales.includes(segments[1] as Locale)) {
            segments[1] = newLocale;
        } else {
            segments.splice(1, 0, newLocale);
        }
        router.push(segments.join("/"));
        router.refresh();
    };

    return (
        <Select value={locale} onValueChange={handleLocaleChange}>
            <SelectTrigger
                size="sm"
                className="gap-2 border-none shadow-none bg-transparent hover:bg-accent w-fit [&_[data-slot=select-value]]:hidden sm:[&_[data-slot=select-value]]:inline"
                aria-label="Change language"
            >
                <Globe className="size-4 shrink-0" aria-hidden="true" />
                <SelectValue />
            </SelectTrigger>
            <SelectContent align="end" className="min-w-[120px]">
                {locales.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                        {localeNames[loc]}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
