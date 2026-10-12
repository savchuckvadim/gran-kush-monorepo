import { cn } from "@workspace/ui/lib/utils";

import { BrandMark } from "./brand-mark";
import { ClubBadge } from "./club-badge";

interface ShellBrandProps {
    name: string;
    /** Премиум-тариф (`customBrand`): название клуба вместо PafPaf. */
    clubName?: string | null;
    className?: string;
}

/** Бренд в сайдбаре: знак и название. Вид по темам — packages/ui/src/styles/shell.css. */
export function ShellBrand({ name, clubName, className }: ShellBrandProps) {
    const label = clubName || name;

    return (
        <span data-slot="brand" className={cn("flex min-w-0 items-center gap-2.5", className)}>
            {clubName ? (
                <ClubBadge name={clubName} />
            ) : (
                <>
                    <BrandMark />
                    <span data-slot="brand-initial" aria-hidden="true">
                        {label.charAt(0)}
                    </span>
                </>
            )}
            <span
                data-slot="brand-name"
                data-lettering={clubName ? undefined : ""}
                className="relative min-w-0"
            >
                <span className="block truncate text-lg font-bold tracking-tight">{label}</span>
                {/* Grind: a still drip band; Infierno: thorns (packages/ui/src/styles/shell.css) */}
                <span data-slot="brand-blood" aria-hidden="true" />
                {/* Infierno: the black-metal lettering instead of the name, a mask from /brand */}
                {!clubName && <span data-slot="brand-lettering" role="img" aria-label={label} />}
            </span>
        </span>
    );
}
