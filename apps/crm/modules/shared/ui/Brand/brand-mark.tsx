import { useId } from "react";

import { cn } from "@workspace/ui/lib/utils";

import { BRAND } from "@/modules/shared/config/brand";

/** The installation's mark (PafPaf — the two puffs of the site logo). Burberry puts a check flat cap on it. */
export function BrandMark({ className }: { className?: string }) {
    const gradientId = useId();
    const checkId = useId();
    const [from, via, to] = BRAND.palette;
    const fill = `url(#${gradientId})`;

    return (
        <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            data-slot="brand-mark"
            className={cn("size-6 shrink-0", className)}
        >
            <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor={from} />
                    <stop offset=".55" stopColor={via} />
                    <stop offset="1" stopColor={to} />
                </linearGradient>
                <pattern id={checkId} width="3" height="3" patternUnits="userSpaceOnUse">
                    <rect width="3" height="3" fill="#dcc5a1" />
                    <path d="M0 1.5h3M1.5 0v3" stroke="#1d1a17" strokeWidth=".55" />
                    <path d="M0 .5h3M.5 0v3" stroke="#b3261e" strokeWidth=".2" />
                </pattern>
            </defs>
            {BRAND.mark.shapes.map((shape, index) =>
                shape.kind === "circle" ? (
                    <circle
                        key={index}
                        cx={shape.cx}
                        cy={shape.cy}
                        r={shape.r}
                        fill={fill}
                        opacity={shape.opacity}
                    />
                ) : (
                    <path key={index} d={shape.d} fill={fill} opacity={shape.opacity} />
                )
            )}
            {/* the cap: a check crown over the big shape, a black band and a peak to the right */}
            <g data-slot="brand-hat">
                <path d="M2.2 10.6C3.4 5.6 14.6 5.6 15.8 10.6Z" fill={`url(#${checkId})`} />
                <path d="M1.6 10.3h14.6l3.4.5-.7 1.3H1.9Z" fill="#1d1a17" />
            </g>
        </svg>
    );
}
