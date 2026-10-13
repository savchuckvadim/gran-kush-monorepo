import type { ReactNode } from "react";

import { chevronClipPath } from "@workspace/ui/lib/chevron";
import { readableTextColor } from "@workspace/ui/lib/color";

export interface KanbanColumnHeaderProps {
    title: string;
    color: string;
    count?: number;
    /** Under the chevron: the column total */
    aside?: ReactNode;
}

/** The chevron on top of a column, in the stage colour, with the number of cards. */
export function KanbanColumnHeader({ title, color, count, aside }: KanbanColumnHeaderProps) {
    return (
        <header data-slot="kanban-column-header" className="space-y-1.5">
            <div
                className="flex h-8 items-center gap-1.5 pr-5 pl-3 text-xs font-semibold"
                style={{
                    backgroundColor: color,
                    color: readableTextColor(color),
                    clipPath: chevronClipPath(true),
                }}
            >
                <span className="truncate">{title}</span>
                {count !== undefined && <span className="tabular-nums opacity-80">{count}</span>}
            </div>
            {aside}
        </header>
    );
}
