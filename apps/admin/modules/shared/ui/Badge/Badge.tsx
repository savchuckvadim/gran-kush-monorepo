import type { ComponentProps } from "react";

import { cn } from "@workspace/ui/lib/utils";

export type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger";

const TONE_CLASSES: Record<BadgeTone, string> = {
    neutral: "bg-muted text-muted-foreground",
    info: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    success: "bg-green-500/10 text-green-700 dark:text-green-300",
    warning: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    danger: "bg-red-500/10 text-red-700 dark:text-red-300",
};

export function Badge({
    tone = "neutral",
    className,
    ...props
}: ComponentProps<"span"> & { tone?: BadgeTone }) {
    return (
        <span
            data-slot="badge"
            className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
                TONE_CLASSES[tone],
                className
            )}
            {...props}
        />
    );
}
