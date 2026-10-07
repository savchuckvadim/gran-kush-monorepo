import { cn } from "@workspace/ui/lib/utils";

import type { SkinId, SkinMode } from "@/modules/shared/config/skins";

const MENU_ITEMS = 4;
const CHART_DOTS = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4"] as const;

/** A mini CRM screen with its own data-skin, so tokens and fonts resolve for that skin. */
export function SkinPreview({ skin, mode }: { skin: SkinId; mode: SkinMode }) {
    return (
        <span
            aria-hidden="true"
            data-skin={skin}
            className={cn(
                "grid h-[86px] grid-cols-[24px_minmax(0,1fr)] overflow-hidden rounded-[12px] border border-border bg-background font-sans text-foreground",
                mode === "dark" && "dark"
            )}
        >
            <span className="grid content-start gap-[5px] border-r border-sidebar-border bg-sidebar px-1.5 py-2">
                <span className="h-1 rounded-[2px] bg-sidebar-primary" />
                {Array.from({ length: MENU_ITEMS }, (_, index) => (
                    <span key={index} className="h-1 rounded-[2px] bg-muted-foreground/40" />
                ))}
            </span>
            <span className="grid content-start gap-1.5 p-2">
                <span className="flex items-center justify-between rounded-[min(var(--radius),8px)] border border-border bg-card px-2 py-1.5 text-card-foreground">
                    <span className="text-[17px] leading-none [font-family:var(--font-display)] [font-weight:var(--display-weight)] [letter-spacing:var(--display-tracking)] [text-transform:var(--display-case)]">
                        Aa
                    </span>
                    <span className="h-3 w-[34px] rounded-full bg-primary" />
                </span>
                <span className="flex gap-1">
                    {CHART_DOTS.map((dot) => (
                        <span key={dot} className={cn("size-3 rounded-full", dot)} />
                    ))}
                </span>
            </span>
        </span>
    );
}
