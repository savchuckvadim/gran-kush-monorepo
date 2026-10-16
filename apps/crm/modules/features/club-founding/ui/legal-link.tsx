import type { ReactNode } from "react";

import { type LegalDoc, legalPageUrl } from "@/modules/shared/config/legal";

/** A legal document opened in a new tab, for `t.rich` chunks of the terms checkbox. */
export function LegalLink({
    locale,
    doc,
    children,
}: {
    locale: string;
    doc: LegalDoc;
    children: ReactNode;
}) {
    return (
        <a
            href={legalPageUrl(locale, doc)}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-primary"
        >
            {children}
        </a>
    );
}
