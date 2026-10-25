import { ChevronDown } from "lucide-react";

import type { FaqItem } from "@/modules/content/types";

interface FaqListProps {
    items: readonly FaqItem[];
    /** Groups the items so opening one closes the others. */
    group: string;
}

/** Questions as native disclosure elements: no script, keyboard and search engines see them all. */
export const FaqList = ({ items, group }: FaqListProps) => (
    <div className="faq divide-y divide-border border-y border-border">
        {items.map((item) => (
            <details key={item.question} name={group} className="group/faq">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-left text-base font-medium md:text-lg [&::-webkit-details-marker]:hidden">
                    {item.question}
                    <ChevronDown className="mt-1 size-5 shrink-0 text-muted-foreground transition-transform group-open/faq:rotate-180" />
                </summary>
                <p className="max-w-[65ch] pb-6 text-muted-foreground">{item.answer}</p>
            </details>
        ))}
    </div>
);
