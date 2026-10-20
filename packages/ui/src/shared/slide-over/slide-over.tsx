"use client";

import { X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import type { CSSProperties, ReactNode } from "react";

import { cn } from "@workspace/ui/lib/utils";

export interface SlideOverProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** 0 — the first panel; every next one is a little narrower and lies over the previous */
    level?: number;
    /** A panel above covers this one: it steps aside to the left, like a sheet under a sheet */
    covered?: boolean;
    /** The accessible name; shown in the panel bar */
    title: ReactNode;
    /** Buttons in the bar, before the close button */
    actions?: ReactNode;
    closeLabel: string;
    children: ReactNode;
    className?: string;
}

/** Wide enough to show a card and its timeline side by side */
const MAX_WIDTH_PX = 1400;
/** Each panel above is this much narrower, so the edges of the ones below stay in sight */
const NARROWER_PER_LEVEL_PX = 64;

/**
 * A panel sliding in from the right over the page (Bitrix24 sliders). Built on the Radix dialog:
 * focus stays inside, Esc and a click on the dimmed page close the top panel, the page under it
 * keeps its scroll. Knows nothing about what it shows.
 */
export function SlideOver({
    open,
    onOpenChange,
    level = 0,
    covered = false,
    title,
    actions,
    closeLabel,
    children,
    className,
}: SlideOverProps) {
    const style: CSSProperties = {
        width: `min(${MAX_WIDTH_PX - level * NARROWER_PER_LEVEL_PX}px, calc(100vw - ${4 * 16 + level * NARROWER_PER_LEVEL_PX}px))`,
    };

    return (
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay
                    data-slot="slide-over-overlay"
                    className={cn(
                        "fixed inset-0 z-50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none",
                        level === 0 ? "bg-black/45" : "bg-black/25"
                    )}
                />
                <DialogPrimitive.Content
                    data-slot="slide-over"
                    data-level={level}
                    data-covered={covered || undefined}
                    aria-describedby={undefined}
                    style={style}
                    className={cn(
                        "fixed inset-y-0 right-0 z-50 flex flex-col bg-background shadow-2xl outline-none max-md:w-full! md:rounded-l-2xl",
                        "transition-transform duration-300 ease-out",
                        "data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right motion-reduce:animate-none",
                        covered && "-translate-x-6",
                        className
                    )}
                >
                    {/* the close tab sticks out on the left, where Bitrix keeps it */}
                    <DialogPrimitive.Close
                        aria-label={closeLabel}
                        title={closeLabel}
                        className="absolute top-4 -left-11 hidden size-11 items-center justify-center rounded-l-full bg-background text-muted-foreground shadow-[-8px_0_16px_-8px_rgb(0_0_0/0.35)] transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:flex"
                    >
                        <X className="size-5" aria-hidden="true" />
                    </DialogPrimitive.Close>

                    <div
                        data-slot="slide-over-bar"
                        className="flex h-12 shrink-0 items-center gap-1 border-b border-border/60 px-3 md:px-5"
                    >
                        <DialogPrimitive.Title className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                            {title}
                        </DialogPrimitive.Title>
                        {actions}
                        <DialogPrimitive.Close
                            aria-label={closeLabel}
                            className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:hidden"
                        >
                            <X className="size-5" aria-hidden="true" />
                        </DialogPrimitive.Close>
                    </div>

                    <div
                        data-slot="slide-over-body"
                        className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 md:p-6"
                    >
                        {children}
                    </div>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
