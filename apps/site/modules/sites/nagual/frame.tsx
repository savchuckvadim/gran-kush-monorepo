import type { ReactNode } from "react";

import type { Locale } from "@/modules/shared/config/locales";
import type { Site } from "@/payload-types";

interface SiteFrameProps {
    locale: Locale;
    site: Site | null;
    current: string;
    children: ReactNode;
}

// Nagual keeps its own codex layout (design/sites/nagual); the port to blocks is the next step.
export const SiteFrame = ({ children }: SiteFrameProps) => (
    <main className="nagual">{children}</main>
);
