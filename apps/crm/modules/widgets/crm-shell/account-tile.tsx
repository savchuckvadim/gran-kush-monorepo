import Link from "next/link";

import type { LucideIcon } from "lucide-react";

import { DropdownMenuItem } from "@workspace/ui";

/** A tile of the account card: the icon with its label next to it. */
export const ACCOUNT_TILE =
    "relative flex h-auto flex-row items-center gap-3 rounded-xl border border-transparent p-3 text-sm [&_svg:not([class*='size-'])]:size-5 focus:border-border";

export function AccountTileLink({
    href,
    icon: Icon,
    label,
}: {
    href: string;
    icon: LucideIcon;
    label: string;
}) {
    return (
        <DropdownMenuItem asChild className={ACCOUNT_TILE}>
            <Link href={href}>
                <Icon />
                <span className="font-medium">{label}</span>
            </Link>
        </DropdownMenuItem>
    );
}
