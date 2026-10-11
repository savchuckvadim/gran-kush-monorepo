"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { cn } from "@workspace/ui/lib/utils";

import { useAuth } from "@/modules/processes";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

interface UserButtonProps {
    /** `drawer` — full-width row in the mobile menu; `bar` — compact chip in the header. */
    variant: "bar" | "drawer";
    onNavigate?: () => void;
}

/** Link to the employee profile: initial in a circle plus the account email. */
export function UserButton({ variant, onNavigate }: UserButtonProps) {
    const t = useTranslations("crm.shell");
    const localizedLink = useLocalizedLink();
    const { currentUser } = useAuth();
    const email = currentUser?.email;
    const initial = email ? email.charAt(0).toUpperCase() : "?";

    return (
        <Link
            href={localizedLink(ROUTES.CRM_PROFILE)}
            onClick={onNavigate}
            title={email ?? t("profile")}
            className={cn(
                "flex min-w-0 items-center gap-2 rounded-full text-sm transition-colors hover:bg-accent",
                variant === "drawer" ? "w-full rounded-lg px-2 py-2" : "py-1 pl-1 pr-1 xl:pr-3"
            )}
        >
            <span
                aria-hidden="true"
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
            >
                {initial}
            </span>
            <span
                className={cn(
                    "truncate",
                    variant === "drawer" ? "block" : "hidden max-w-48 xl:block"
                )}
            >
                {email ?? t("profile")}
            </span>
        </Link>
    );
}
