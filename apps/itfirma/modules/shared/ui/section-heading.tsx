import type { ReactNode } from "react";

import { Reveal } from "./reveal";

interface SectionHeadingProps {
    eyebrow: string;
    title: ReactNode;
    lead?: string;
}

/** Numbered eyebrow in mono, display title, one-paragraph lead. */
export const SectionHeading = ({ eyebrow, title, lead }: SectionHeadingProps) => (
    <Reveal className="mb-10 max-w-2xl md:mb-14">
        <p className="mb-3 font-mono text-xs tracking-widest text-primary uppercase">{eyebrow}</p>
        <h2 className="text-3xl leading-tight md:text-5xl">{title}</h2>
        {lead ? <p className="mt-4 text-base text-muted-foreground md:text-lg">{lead}</p> : null}
    </Reveal>
);
