"use client";

import type { ReactNode } from "react";

import { Card } from "@workspace/ui/components/card";

import { CreateDialog } from "./CreateDialog";
import type { ListPageCreate, ListPageVariant } from "./list-page.types";
import { ListPageHeader } from "./ListPageHeader";

export interface ListPageProps {
    title: ReactNode;
    description?: ReactNode;
    /** Кнопки рядом с «Создать»: ссылки, второстепенные действия */
    actions?: ReactNode;
    /** «Создать» с формой в диалоге; нет прав на создание — не передавайте */
    create?: ListPageCreate;
    variant?: ListPageVariant;
    /** Сам список — `EntityList` с колонками; строка ведёт к записи */
    children: ReactNode;
}

/**
 * Страница списка сущностей CRM: заголовок, «Создать» с формой в диалоге и список под ними.
 * Списки не делят страницу с формой создания — форма открывается поверх, и список не уезжает.
 */
export function ListPage({
    title,
    description,
    actions,
    create,
    variant = "page",
    children,
}: ListPageProps) {
    const header = (
        <ListPageHeader
            title={title}
            description={description}
            variant={variant}
            actions={
                actions || create ? (
                    <>
                        {actions}
                        {create ? <CreateDialog {...create} /> : null}
                    </>
                ) : null
            }
        />
    );

    if (variant === "section") {
        return (
            <Card data-slot="list-page" className="gap-4 px-4 md:px-6">
                {header}
                {children}
            </Card>
        );
    }

    return (
        <div data-slot="list-page" className="space-y-4">
            {header}
            {children}
        </div>
    );
}
