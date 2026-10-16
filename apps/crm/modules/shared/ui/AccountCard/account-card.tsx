"use client";

import { LogOut } from "lucide-react";
import type { ReactNode } from "react";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@workspace/ui";

import { AccountAvatar } from "./account-avatar";

interface AccountCardProps {
    /** The header capsule that opens the card */
    trigger: ReactNode;
    email: string | undefined;
    /** Under the email: the role and the club, or what this app is */
    subtitle?: string;
    /** Tiles: `AccountTileLink`, `AccountTileButton`, `LanguageTile` */
    children: ReactNode;
    logout: { label: string; pending: boolean; onSelect: () => void };
}

/**
 * The account card at the avatar, the same in the CRM and in the cabinet: who is signed in,
 * tiles of what the account can do here, and signing out. Wide with two columns of tiles on a
 * desktop, one narrow column on a phone.
 */
export function AccountCard({ trigger, email, subtitle, children, logout }: AccountCardProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                sideOffset={8}
                data-slot="account-card"
                className="w-[min(18rem,calc(100vw-1.5rem))] p-0 md:w-[24rem]"
            >
                <div className="flex items-center gap-3 border-b p-4">
                    <AccountAvatar email={email} className="size-11 text-base" />
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{email}</p>
                        {subtitle && (
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-1 p-2 md:grid-cols-2">{children}</div>

                <div className="border-t p-2">
                    <DropdownMenuItem
                        variant="destructive"
                        disabled={logout.pending}
                        onSelect={logout.onSelect}
                        className="rounded-xl px-3 py-2.5"
                    >
                        <LogOut />
                        {logout.label}
                    </DropdownMenuItem>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
