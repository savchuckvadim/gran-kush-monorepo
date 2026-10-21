"use client";

import { CircleHelp } from "lucide-react";
import type { ReactNode } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover";
import { cn } from "@workspace/ui/lib/utils";

export interface InfoHintProps {
    /** Accessible name of the "?" button, e.g. the field it explains */
    label: string;
    title?: ReactNode;
    children: ReactNode;
    className?: string;
}

/**
 * A "?" next to a label that opens a short explanation of a term. A popover, not a tooltip:
 * phones have no hover, so the explanation opens on tap and stays until dismissed.
 */
export function InfoHint({ label, title, children, className }: InfoHintProps) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    aria-label={label}
                    className={cn(
                        "inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                        className
                    )}
                >
                    <CircleHelp className="size-4" aria-hidden="true" />
                </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="space-y-1 text-sm leading-relaxed">
                {title ? <p className="font-medium">{title}</p> : null}
                <div className="text-muted-foreground">{children}</div>
            </PopoverContent>
        </Popover>
    );
}
