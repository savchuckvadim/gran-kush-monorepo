import type { ReactNode } from "react";

import { cn } from "@workspace/ui/lib/utils";

import type { ListPageVariant } from "./list-page.types";

interface ListPageHeaderProps {
    title: ReactNode;
    description?: ReactNode;
    /** Кнопки справа от заголовка; на телефоне — строкой под ним */
    actions?: ReactNode;
    variant: ListPageVariant;
}

export function ListPageHeader({ title, description, actions, variant }: ListPageHeaderProps) {
    const Heading = variant === "page" ? "h1" : "h2";

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
                <Heading
                    className={cn("font-semibold", variant === "page" ? "text-2xl" : "text-lg")}
                >
                    {title}
                </Heading>
                {description ? (
                    <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                ) : null}
            </div>
            {actions ? (
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
                    {actions}
                </div>
            ) : null}
        </div>
    );
}
