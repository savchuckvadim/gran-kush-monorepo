import type { ReactNode } from "react";

import { type ChevronSize, chevronClipPath, chevronHeight } from "@workspace/ui/lib/chevron";

export interface KanbanColumnHeaderProps {
    title: string;
    color: string;
    count?: number;
    /** Высота шеврона; `sm` — тонкая лента, как в полосе стадий */
    size?: ChevronSize;
    /** Under the chevron: the column total */
    aside?: ReactNode;
}

/**
 * The chevron on top of a column, tinted with the stage colour, with the number of cards in a
 * badge of the full colour. Tint instead of a solid fill keeps a wall of columns calm.
 */
export function KanbanColumnHeader({
    title,
    color,
    count,
    size = "sm",
    aside,
}: KanbanColumnHeaderProps) {
    return (
        <header data-slot="kanban-column-header" className="space-y-1.5">
            <div
                className="flex items-center gap-2 pr-2 pl-3 text-xs font-semibold"
                style={{
                    height: chevronHeight(size),
                    backgroundColor: `color-mix(in oklab, ${color} 18%, var(--card))`,
                    clipPath: chevronClipPath(true, size),
                }}
            >
                <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                    aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate">{title}</span>
                {count !== undefined && (
                    <span
                        className="inline-flex h-4.5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums"
                        style={{
                            backgroundColor: `color-mix(in oklab, ${color} 30%, var(--card))`,
                        }}
                    >
                        {count}
                    </span>
                )}
            </div>
            {aside}
        </header>
    );
}
