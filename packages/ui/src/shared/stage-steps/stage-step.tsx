import type { ComponentProps, ReactNode } from "react";

import { chevronClipPath } from "@workspace/ui/lib/chevron";
import { readableTextColor } from "@workspace/ui/lib/color";
import { cn } from "@workspace/ui/lib/utils";

/** `ref` comes through the props (React 19): a popover can anchor to a step via `asChild`. */
export interface StageStepProps extends Omit<ComponentProps<"button">, "color"> {
    /** Fill of a passed or current step */
    color: string;
    /** Passed and current steps are filled; future ones stay muted */
    filled: boolean;
    /** The first step has no notch on the left */
    first?: boolean;
    children: ReactNode;
}

/** One chevron of a stage bar (Bitrix24 style). The text colour follows the fill. */
export function StageStep({
    color,
    filled,
    first = false,
    className,
    style,
    children,
    ...props
}: StageStepProps) {
    return (
        <button
            type="button"
            {...props}
            // after the spread: a Radix trigger (`asChild`) passes its own data-slot
            data-slot="stage-step"
            data-filled={filled || undefined}
            className={cn(
                "flex h-9 min-w-24 flex-1 items-center justify-center px-5 text-xs font-semibold transition-[filter,background-color]",
                "enabled:cursor-pointer enabled:hover:brightness-95 disabled:cursor-default",
                "focus-visible:underline focus-visible:outline-none focus-visible:brightness-90",
                !filled && "bg-muted text-muted-foreground",
                className
            )}
            style={{
                clipPath: chevronClipPath(first),
                ...(filled ? { backgroundColor: color, color: readableTextColor(color) } : {}),
                ...style,
            }}
        >
            <span className="truncate">{children}</span>
        </button>
    );
}
