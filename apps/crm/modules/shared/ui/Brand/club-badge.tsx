import { cn } from "@workspace/ui/lib/utils";

const initialsOf = (name: string) =>
    name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word.charAt(0))
        .join("")
        .toUpperCase() || "?";

/** Инициалы клуба в квадрате — знак клуба в переключателе и в бренде премиум-тарифа. */
export function ClubBadge({ name, className }: { name: string; className?: string }) {
    return (
        <span
            data-slot="brand-badge"
            aria-hidden="true"
            className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-[0.6875rem] font-bold text-primary-foreground",
                className
            )}
        >
            {initialsOf(name)}
        </span>
    );
}
