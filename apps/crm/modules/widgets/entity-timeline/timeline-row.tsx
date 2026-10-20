"use client";

import type { ReactNode } from "react";

import { cn } from "@workspace/ui/lib/utils";

import { useTimeFormat } from "@/modules/shared/lib/use-date-format";

interface TimelineRowProps {
    icon: ReactNode;
    /** Цвет значка: вид записи */
    tone: string;
    at: string;
    /** Последняя строка дня — без нити под значком */
    last: boolean;
    children: ReactNode;
}

/** Строка таймлайна: значок на нити дня, содержимое и время справа. */
export function TimelineRow({ icon, tone, at, last, children }: TimelineRowProps) {
    const time = useTimeFormat();

    return (
        <li className="relative flex gap-3 pb-3">
            {!last && (
                <span
                    aria-hidden="true"
                    className="absolute top-8 bottom-0 left-4 w-px bg-border"
                />
            )}
            <span
                className={cn(
                    "relative flex size-8 shrink-0 items-center justify-center rounded-full [&_svg]:size-4",
                    tone
                )}
            >
                {icon}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-1">{children}</div>
            <time
                dateTime={at}
                className="shrink-0 pt-1.5 text-xs text-muted-foreground tabular-nums"
            >
                {time(at)}
            </time>
        </li>
    );
}
