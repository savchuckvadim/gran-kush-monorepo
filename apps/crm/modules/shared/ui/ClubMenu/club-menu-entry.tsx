import { Check } from "lucide-react";

import { DropdownMenuItem } from "@workspace/ui";

import { ClubBadge } from "@/modules/shared/ui/Brand";

export interface ClubMenuClub {
    id: string;
    name: string;
    /** Under the name: the slug or a role */
    hint?: string;
    current: boolean;
}

/** A club in the switcher: its badge, name and a check at the current one. */
export function ClubMenuEntry({ club, onSelect }: { club: ClubMenuClub; onSelect: () => void }) {
    return (
        <DropdownMenuItem onSelect={onSelect} className="gap-2.5">
            <ClubBadge name={club.name} className="size-7" />
            <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{club.name}</span>
                {club.hint && (
                    <span className="block truncate text-xs text-muted-foreground">
                        {club.hint}
                    </span>
                )}
            </span>
            {club.current && <Check className="text-primary" aria-hidden="true" />}
        </DropdownMenuItem>
    );
}
