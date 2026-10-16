"use client";

import { Languages } from "lucide-react";

import {
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
} from "@workspace/ui";
import { cn } from "@workspace/ui/lib/utils";

import { localeNames, locales } from "@/modules/shared/config/i18n";

import { ACCOUNT_TILE } from "./account-tile-class";

interface LanguageTileProps {
    label: string;
    locale: string;
    onChange: (locale: string) => void;
}

/** The interface language: the current one on the tile, the list in a sub-menu. */
export function LanguageTile({ label, locale, onChange }: LanguageTileProps) {
    return (
        <DropdownMenuSub>
            {/* the sub-trigger's own chevron goes to the tile's right edge */}
            <DropdownMenuSubTrigger className={cn(ACCOUNT_TILE, "[&>svg:last-child]:ml-auto")}>
                <Languages />
                <span className="flex min-w-0 flex-col">
                    <span className="font-medium">{label}</span>
                    <span className="text-xs text-muted-foreground">
                        {localeNames[locale as keyof typeof localeNames]}
                    </span>
                </span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
                <DropdownMenuRadioGroup value={locale} onValueChange={onChange}>
                    {locales.map((item) => (
                        <DropdownMenuRadioItem key={item} value={item}>
                            {localeNames[item]}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
        </DropdownMenuSub>
    );
}
