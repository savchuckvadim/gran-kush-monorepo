"use client";

import { useTranslations } from "next-intl";

import { RotateCcw, Settings2 } from "lucide-react";

import { Button, Popover, PopoverContent, PopoverTrigger, Switch } from "@workspace/ui";

import { ORDER_CARD_FIELDS, type OrderCardField } from "./card-fields";

interface KanbanCardFieldsMenuProps {
    value: readonly OrderCardField[];
    onChange: (fields: OrderCardField[]) => void;
    onReset: () => void;
    disabled?: boolean;
}

/** Шестерёнка над доской: что показывать на карточке. Номер заказа есть всегда. */
export function KanbanCardFieldsMenu({
    value,
    onChange,
    onReset,
    disabled,
}: KanbanCardFieldsMenuProps) {
    const t = useTranslations("crm.orders.kanban.cardFields");

    const toggle = (field: OrderCardField, on: boolean) =>
        onChange(
            on
                ? ORDER_CARD_FIELDS.filter((key) => key === field || value.includes(key))
                : value.filter((key) => key !== field)
        );

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" size="icon-sm" aria-label={t("label")} title={t("label")}>
                    <Settings2 aria-hidden="true" />
                </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-2">
                <p className="px-2 pt-1 pb-2 text-xs text-muted-foreground">{t("hint")}</p>
                <ul>
                    {ORDER_CARD_FIELDS.map((field) => (
                        <li key={field}>
                            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm hover:bg-accent">
                                <span>{t(`fields.${field}`)}</span>
                                <Switch
                                    checked={value.includes(field)}
                                    disabled={disabled}
                                    onCheckedChange={(on) => toggle(field, on)}
                                />
                            </label>
                        </li>
                    ))}
                </ul>
                <Button
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    onClick={onReset}
                    className="mt-1 w-full justify-start"
                >
                    <RotateCcw aria-hidden="true" />
                    {t("reset")}
                </Button>
            </PopoverContent>
        </Popover>
    );
}
