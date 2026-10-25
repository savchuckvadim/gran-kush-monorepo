import { SITE_NAME } from "@/modules/shared/config/site";

interface LogoProps {
    className?: string;
    /** Only the bracketed «IT», for the narrow bottom bar of phones. */
    compact?: boolean;
}

/** Wordmark: a primary-coloured square bracket pair around «IT», then «firma». */
export const Logo = ({ className, compact = false }: LogoProps) => (
    <span
        className={[
            "inline-flex items-baseline gap-1 font-display text-lg tracking-tight",
            className,
        ]
            .filter(Boolean)
            .join(" ")}
        aria-label={SITE_NAME}
    >
        <span className="font-mono text-primary">[</span>
        <span className="font-semibold">IT</span>
        <span className="font-mono text-primary">]</span>
        {compact ? null : <span className="text-muted-foreground">firma</span>}
    </span>
);
