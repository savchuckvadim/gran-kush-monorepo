import type { ReactNode } from "react";

import { Card } from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";

export interface StatTileProps {
    label: ReactNode;
    value: ReactNode;
    /** One quiet line under the value */
    hint?: ReactNode;
    icon?: ReactNode;
    className?: string;
}

/** A figure with its label: the member card's visits and spending, a dashboard counter. */
export function StatTile({ label, value, hint, icon, className }: StatTileProps) {
    return (
        <Card
            data-component="stat-tile"
            size="sm"
            className={cn("gap-1 px-3 py-3 md:px-4", className)}
        >
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground [&_svg]:size-3.5">
                {icon}
                <span className="truncate">{label}</span>
            </div>
            <div className="text-xl font-semibold tracking-tight tabular-nums md:text-2xl">
                {value}
            </div>
            {hint ? <div className="truncate text-xs text-muted-foreground">{hint}</div> : null}
        </Card>
    );
}
