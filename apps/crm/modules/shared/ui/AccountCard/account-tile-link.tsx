import Link from "next/link";

import type { LucideIcon } from "lucide-react";

import { DropdownMenuItem } from "@workspace/ui";

import { ACCOUNT_TILE } from "./account-tile-class";

/** A tile that goes somewhere: a page of the app or the other app (CRM ↔ cabinet). */
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
