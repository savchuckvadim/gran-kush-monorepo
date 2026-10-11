"use client";

import { cn } from "@workspace/ui/lib/utils";

interface BurgerButtonProps {
    isOpen: boolean;
    onToggle: () => void;
    openLabel: string;
    closeLabel: string;
    className?: string;
}

/**
 * Menu button whose bars turn into a cross. Each skin animates it its own way:
 * packages/ui/src/styles/burger.css, keyed by data-skin on <html>.
 */
export function BurgerButton({
    isOpen,
    onToggle,
    openLabel,
    closeLabel,
    className,
}: BurgerButtonProps) {
    return (
        <button
            type="button"
            data-slot="burger"
            data-state={isOpen ? "open" : "closed"}
            aria-label={isOpen ? closeLabel : openLabel}
            aria-expanded={isOpen}
            onClick={onToggle}
            className={cn(className)}
        >
            <span />
            <span />
            <span />
        </button>
    );
}
