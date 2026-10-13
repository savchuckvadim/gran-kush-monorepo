import { cn } from "@workspace/ui/lib/utils";

export interface InitialsAvatarProps {
    /** Full name; the first letters of up to two words are shown */
    name: string;
    className?: string;
}

const initialsOf = (name: string): string =>
    name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word.charAt(0).toUpperCase())
        .join("");

/** A round badge with a person's initials (responsible employee on a card). */
export function InitialsAvatar({ name, className }: InitialsAvatarProps) {
    return (
        <span
            data-slot="initials-avatar"
            title={name}
            aria-label={name}
            className={cn(
                "inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[0.625rem] font-semibold text-secondary-foreground",
                className
            )}
        >
            {initialsOf(name) || "?"}
        </span>
    );
}
