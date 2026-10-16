import { cn } from "@workspace/ui/lib/utils";

/** The account's first letter in a circle: the header capsule and the account card. */
export function AccountAvatar({ email, className }: { email?: string; className?: string }) {
    return (
        <span
            aria-hidden="true"
            className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground",
                className
            )}
        >
            {email ? email.charAt(0).toUpperCase() : "?"}
        </span>
    );
}
