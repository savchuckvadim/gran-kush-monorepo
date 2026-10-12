"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { ListPlus } from "lucide-react";

import {
    Button,
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuTrigger,
    Input,
} from "@workspace/ui";

import type { EntityFilterField } from "./types";
import { MAX_VISIBLE_FIELDS } from "./use-visible-fields";

const SEARCH_FROM = 8;

/** «Fields»: which fields stand in the panel, at most ten, with a search when there are many. */
export function FieldPicker({
    fields,
    visibleKeys,
    onToggle,
}: {
    fields: EntityFilterField[];
    visibleKeys: string[];
    onToggle: (key: string) => void;
}) {
    const t = useTranslations("crm.entityFilter");
    const [query, setQuery] = useState("");
    const needle = query.trim().toLowerCase();
    const shown = needle
        ? fields.filter((field) => field.label.toLowerCase().includes(needle))
        : fields;
    const isFull = visibleKeys.length >= MAX_VISIBLE_FIELDS;

    return (
        <DropdownMenu onOpenChange={(open) => !open && setQuery("")}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                    <ListPlus />
                    {t("addField")}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>{t("fieldPickerTitle")}</DropdownMenuLabel>
                {fields.length >= SEARCH_FROM && (
                    <div className="px-1 pb-1">
                        <Input
                            value={query}
                            placeholder={t("fieldPickerSearch")}
                            aria-label={t("fieldPickerSearch")}
                            className="h-8"
                            onChange={(event) => setQuery(event.target.value)}
                            // the menu's type-ahead would take the letters
                            onKeyDown={(event) => event.stopPropagation()}
                        />
                    </div>
                )}
                {shown.map((field) => {
                    const isOn = visibleKeys.includes(field.key);
                    return (
                        <DropdownMenuCheckboxItem
                            key={field.key}
                            checked={isOn}
                            disabled={!isOn && isFull}
                            onCheckedChange={() => onToggle(field.key)}
                            onSelect={(event) => event.preventDefault()}
                        >
                            <span className="truncate">{field.label}</span>
                        </DropdownMenuCheckboxItem>
                    );
                })}
                {isFull && (
                    <p className="text-muted-foreground px-2 py-1.5 text-xs">
                        {t("fieldPickerLimit", { max: MAX_VISIBLE_FIELDS })}
                    </p>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
