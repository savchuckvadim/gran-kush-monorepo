import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

import { CONTACT_PATH } from "@/modules/shared/config/routes";
import { Link } from "@/modules/shared/i18n/navigation";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "lg";

interface CtaLinkProps {
    children: ReactNode;
    href?: string;
    variant?: Variant;
    size?: Size;
    className?: string;
    /** Primary buttons point right; a link into the page may want no arrow. */
    arrow?: boolean;
    /** Runs before navigation, e.g. to close the burger panel. */
    onClick?: () => void;
}

const VARIANT: Record<Variant, string> = {
    primary:
        "shine bg-primary text-primary-foreground hover:scale-[1.02] active:scale-[0.98] transition-transform",
    secondary: "border border-border bg-card/70 text-foreground hover:bg-accent transition-colors",
    ghost: "text-primary underline-offset-4 hover:underline",
};

const SIZE: Record<Size, string> = {
    md: "h-11 px-5 text-sm",
    lg: "h-13 px-7 text-base",
};

/**
 * The one button of the site. Without `href` it leads to the request form, with the same label
 * everywhere (`cta.request` in the messages); other targets pass their own label.
 */
export const CtaLink = ({
    children,
    href = CONTACT_PATH,
    variant = "primary",
    size = "md",
    className,
    arrow = variant === "primary",
    onClick,
}: CtaLinkProps) => (
    <Link
        href={href}
        onClick={onClick}
        className={[
            "group inline-flex shrink-0 items-center gap-2 rounded-full font-medium whitespace-nowrap",
            variant === "ghost" ? "" : SIZE[size],
            VARIANT[variant],
            className,
        ]
            .filter(Boolean)
            .join(" ")}
    >
        {children}
        {arrow ? (
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        ) : null}
    </Link>
);
