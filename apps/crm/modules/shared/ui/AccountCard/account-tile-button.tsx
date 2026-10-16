import type { LucideIcon } from "lucide-react";

import { DropdownMenuItem } from "@workspace/ui";

import { ACCOUNT_TILE } from "./account-tile-class";

/** A tile that does something in place: opens the appearance sheet and the like. */
export function AccountTileButton({
    icon: Icon,
    label,
    onSelect,
}: {
    icon: LucideIcon;
    label: string;
    onSelect: () => void;
}) {
    return (
        <DropdownMenuItem className={ACCOUNT_TILE} onSelect={onSelect}>
            <Icon />
            <span className="font-medium">{label}</span>
        </DropdownMenuItem>
    );
}
