import type { ReactNode } from "react";

import { Reveal } from "./reveal";

interface SectionHeadingProps {
    title: ReactNode;
    lead?: string;
    /** Small label above the title; the home page uses it on two sections at most. */
    kicker?: string;
    size?: "md" | "lg";
    className?: string;
}

/** Display title with an optional one-paragraph lead, stacked and left-aligned. */
export const SectionHeading = ({
    title,
    lead,
    kicker,
    size = "md",
    className,
}: SectionHeadingProps) => (
    <Reveal className={["max-w-3xl", className].filter(Boolean).join(" ")}>
        {kicker ? <p className="mb-4 text-sm font-medium text-primary">{kicker}</p> : null}
        <h2
            className={
                size === "lg"
                    ? "text-4xl leading-[1.05] md:text-6xl"
                    : "text-3xl leading-tight md:text-5xl"
            }
        >
            {title}
        </h2>
        {lead ? <p className="mt-5 max-w-[60ch] text-lg text-muted-foreground">{lead}</p> : null}
    </Reveal>
);
