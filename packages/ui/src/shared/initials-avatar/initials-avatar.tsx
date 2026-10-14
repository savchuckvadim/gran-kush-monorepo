import { hueOf } from "@workspace/ui/lib/color";
import { cn } from "@workspace/ui/lib/utils";

export interface InitialsAvatarProps {
    /** Full name; the first letters of up to two words are shown */
    name: string;
    /** A colour of its own, the same for the same name every time (a member card hero) */
    colorful?: boolean;
    className?: string;
}

const initialsOf = (name: string): string =>
    name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word.charAt(0).toUpperCase())
        .join("");

/** A round badge with a person's initials (responsible employee on a card, a member's portrait). */
export function InitialsAvatar({ name, colorful = false, className }: InitialsAvatarProps) {
    const hue = hueOf(name);
    return (
        <span
            data-slot="initials-avatar"
            title={name}
            aria-label={name}
            style={
                colorful
                    ? {
                          backgroundImage: `linear-gradient(135deg, oklch(0.68 0.16 ${hue}), oklch(0.5 0.17 ${(hue + 40) % 360}))`,
                      }
                    : undefined
            }
            className={cn(
                "inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[0.625rem] font-semibold",
                colorful ? "text-white" : "bg-secondary text-secondary-foreground",
                className
            )}
        >
            {initialsOf(name) || "?"}
        </span>
    );
}
