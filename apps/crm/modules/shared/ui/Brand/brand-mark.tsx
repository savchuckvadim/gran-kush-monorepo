import { useId } from "react";

import { cn } from "@workspace/ui/lib/utils";

/** PafPaf mark — the two puffs from the product site logo. */
export function BrandMark({ className }: { className?: string }) {
    const gradientId = useId();

    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("size-6 shrink-0", className)}>
            <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#7b61ff" />
                    <stop offset=".55" stopColor="#ff5fa2" />
                    <stop offset="1" stopColor="#ffb340" />
                </linearGradient>
            </defs>
            <circle cx="9" cy="13.5" r="6.4" fill={`url(#${gradientId})`} />
            <circle cx="16.6" cy="8" r="4.3" fill={`url(#${gradientId})`} opacity=".82" />
        </svg>
    );
}
