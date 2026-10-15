import type { ComponentProps, ReactNode } from "react";

import {
    chevronClipPath,
    chevronHeight,
    chevronPadding,
    type ChevronSize,
} from "@workspace/ui/lib/chevron";
import { readableTextColor } from "@workspace/ui/lib/color";
import { cn } from "@workspace/ui/lib/utils";

/** `ref` comes through the props (React 19): a popover can anchor to a step via `asChild`. */
export interface StageStepProps extends Omit<ComponentProps<"button">, "color"> {
    /** Fill of a passed or current step */
    color: string;
    /** Passed and current steps are filled; future ones stay muted */
    filled: boolean;
    /** Только текущий шаг заливается цветом целиком; пройденные — тоном того же цвета */
    current?: boolean;
    /** The first step has no notch on the left */
    first?: boolean;
    /** Высота ленты; `sm` — тонкая, по умолчанию */
    size?: ChevronSize;
    children: ReactNode;
}

/** Размер текста по высоте ленты: тонкая лента не должна нести крупный шрифт. */
const FONT: Readonly<Record<ChevronSize, string>> = {
    sm: "text-[11px]",
    md: "text-xs",
    lg: "text-[13px]",
};

/**
 * One chevron of a stage bar. The current step is filled with the stage colour; passed steps
 * take a tint of it, so the bar reads as a path rather than one solid block. The text colour
 * follows the fill.
 */
export function StageStep({
    color,
    filled,
    current = false,
    first = false,
    size = "sm",
    className,
    style,
    children,
    ...props
}: StageStepProps) {
    const fill = current
        ? { backgroundColor: color, color: readableTextColor(color) }
        : filled
          ? {
                backgroundColor: `color-mix(in oklab, ${color} 18%, var(--card))`,
                color: `color-mix(in oklab, ${color} 75%, var(--foreground))`,
            }
          : {};

    return (
        <button
            type="button"
            {...props}
            // after the spread: a Radix trigger (`asChild`) passes its own data-slot
            data-slot="stage-step"
            data-filled={filled || undefined}
            data-current={current || undefined}
            className={cn(
                "flex min-w-24 flex-1 items-center justify-center gap-1.5 font-semibold transition-[filter,background-color]",
                FONT[size],
                "enabled:cursor-pointer enabled:hover:brightness-95 disabled:cursor-default",
                "focus-visible:underline focus-visible:outline-none focus-visible:brightness-90",
                !filled && "bg-muted text-muted-foreground",
                className
            )}
            style={{
                height: chevronHeight(size),
                padding: chevronPadding(first, size),
                clipPath: chevronClipPath(first, size),
                ...fill,
                ...style,
            }}
        >
            <span className="truncate">{children}</span>
        </button>
    );
}
