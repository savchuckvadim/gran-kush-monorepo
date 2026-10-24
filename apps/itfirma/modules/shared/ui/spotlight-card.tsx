"use client";

import { type PointerEvent, type ReactNode, useRef } from "react";

interface SpotlightCardProps {
    children: ReactNode;
    className?: string;
}

/** A surface whose border lights up under the pointer (the `.spotlight` rules in globals.css). */
export const SpotlightCard = ({ children, className }: SpotlightCardProps) => {
    const ref = useRef<HTMLDivElement>(null);

    const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
        const node = ref.current;
        if (!node) return;
        const rect = node.getBoundingClientRect();
        node.style.setProperty("--sx", `${event.clientX - rect.left}px`);
        node.style.setProperty("--sy", `${event.clientY - rect.top}px`);
    };

    return (
        <div
            ref={ref}
            onPointerMove={onPointerMove}
            className={["surface spotlight", className].filter(Boolean).join(" ")}
        >
            {children}
        </div>
    );
};
