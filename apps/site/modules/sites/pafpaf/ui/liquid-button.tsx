import NextLink from "next/link";

import type { ReactNode } from "react";

const WAVE = "M0 6 Q 7.5 0 15 6 T 30 6 T 45 6 T 60 6 T 75 6 T 90 6 T 105 6 T 120 6 V12 H0 Z";

interface LiquidButtonProps {
    href: string;
    children: ReactNode;
    variant?: "primary" | "glass";
    size?: "md" | "sm";
    className?: string;
}

// Glass pill that fills with a wave on hover; the primary one is already almost full.
export const LiquidButton = ({
    href,
    children,
    variant = "glass",
    size = "md",
    className,
}: LiquidButtonProps) => {
    const classes = [
        "lbtn",
        "glass",
        variant === "primary" && "lbtn--primary",
        size === "sm" && "lbtn--sm",
        className,
    ]
        .filter(Boolean)
        .join(" ");
    const content = (
        <>
            <span className="lbtn__liq">
                <svg viewBox="0 0 120 12" preserveAspectRatio="none" aria-hidden="true">
                    <path d={WAVE} />
                </svg>
            </span>
            <span>{children}</span>
        </>
    );
    if (/^[a-z]+:/i.test(href)) {
        return (
            <a className={classes} href={href}>
                {content}
            </a>
        );
    }
    return (
        <NextLink className={classes} href={href}>
            {content}
        </NextLink>
    );
};
