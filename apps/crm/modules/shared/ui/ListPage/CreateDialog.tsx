"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Plus } from "lucide-react";

import { Button, ModalDialog } from "@workspace/ui";

import type { ListPageCreate } from "./list-page.types";

/**
 * Кнопка «Создать» и диалог с формой: так создают записи всех списков CRM. На телефоне кнопка
 * во всю ширину шапки, чтобы до неё не тянуться через список.
 */
export function CreateDialog({ label, title, description, size, form }: ListPageCreate) {
    const t = useTranslations("crm.listPage");
    const [open, setOpen] = useState(false);

    return (
        <ModalDialog
            open={open}
            onOpenChange={setOpen}
            title={title}
            description={description}
            size={size}
            scrollable
            trigger={
                <Button className="flex-1 gap-2 sm:flex-none">
                    <Plus className="size-4" aria-hidden="true" />
                    {label ?? t("create")}
                </Button>
            }
        >
            {form({ close: () => setOpen(false) })}
        </ModalDialog>
    );
}
