"use client";

import Link from "next/link";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@workspace/ui";

import { type ClubMenuClub, ClubMenuEntry } from "./club-menu-entry";

export interface ClubMenuAction {
    label: string;
    icon?: LucideIcon;
    href: string;
}

interface ClubMenuProps {
    trigger: ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    title: string;
    clubs: readonly ClubMenuClub[];
    loading?: boolean;
    /** Shown instead of the list while it loads and when it is empty */
    texts: { loading?: string; empty: string };
    onSelect: (clubId: string) => void;
    /** Under a separator: a new club, all memberships */
    actions?: readonly ClubMenuAction[];
}

/**
 * The club the person is in and the move to another one — the same menu in the CRM (clubs of an
 * employee) and in the cabinet (memberships of a member).
 */
export function ClubMenu({
    trigger,
    open,
    onOpenChange,
    title,
    clubs,
    loading = false,
    texts,
    onSelect,
    actions = [],
}: ClubMenuProps) {
    const notice = loading ? texts.loading : clubs.length === 0 ? texts.empty : null;

    return (
        <DropdownMenu open={open} onOpenChange={onOpenChange}>
            <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                    {title}
                </DropdownMenuLabel>
                {notice ? (
                    <p className="px-2 py-1.5 text-sm text-muted-foreground">{notice}</p>
                ) : (
                    clubs.map((club) => (
                        <ClubMenuEntry
                            key={club.id}
                            club={club}
                            onSelect={() => onSelect(club.id)}
                        />
                    ))
                )}
                {actions.length > 0 && <DropdownMenuSeparator />}
                {actions.map(({ label, icon: Icon, href }) => (
                    <DropdownMenuItem key={href} asChild className="gap-2.5">
                        <Link href={href}>
                            {Icon && <Icon className="text-muted-foreground" />}
                            {label}
                        </Link>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
