"use client";

import Link from "next/link";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui";
import { cn } from "@workspace/ui/lib/utils";

const VISIBLE_ITEMS = 3;

export type TileTone = "ok" | "warn" | "muted";

export interface SettingsTileProps {
    icon: LucideIcon;
    title: string;
    /** Big figure: a count or a short value such as the plan name. */
    metric?: ReactNode;
    metricLabel?: string;
    /** Short list under the title; the rest goes into the tooltip. */
    items?: string[];
    description: string;
    badge?: { label: string; tone: TileTone };
    loading?: boolean;
    href?: string;
    onClick?: () => void;
}

const BADGE_TONE: Record<TileTone, string> = {
    ok: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    warn: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    muted: "bg-muted text-muted-foreground",
};

/** Большая квадратная кнопка раздела настроек: цифра, название, короткий список; полный — в подсказке. */
export function SettingsTile({
    icon: Icon,
    title,
    metric,
    metricLabel,
    items = [],
    description,
    badge,
    loading,
    href,
    onClick,
}: SettingsTileProps) {
    const shown = items.slice(0, VISIBLE_ITEMS);
    const hidden = items.length - shown.length;

    const body = (
        <>
            <div className="flex items-start justify-between gap-2">
                <span className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl [&_svg]:size-5">
                    <Icon aria-hidden="true" />
                </span>
                {badge && (
                    <span
                        className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            BADGE_TONE[badge.tone]
                        )}
                    >
                        {badge.label}
                    </span>
                )}
            </div>

            <div className="mt-auto min-w-0 pt-4">
                {metric !== undefined && (
                    <p className="flex items-baseline gap-1.5">
                        <span className="truncate text-3xl leading-none font-semibold">
                            {loading ? "—" : metric}
                        </span>
                        {metricLabel && (
                            <span className="text-muted-foreground truncate text-xs">
                                {metricLabel}
                            </span>
                        )}
                    </p>
                )}
                <p className="mt-2 text-base leading-tight font-semibold">{title}</p>
                <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                    {shown.length > 0
                        ? `${shown.join(", ")}${hidden > 0 ? ` +${hidden}` : ""}`
                        : description}
                </p>
            </div>
        </>
    );

    const className =
        "bg-card text-card-foreground hover:border-primary/40 hover:bg-accent/40 focus-visible:ring-ring flex min-h-44 w-full flex-col rounded-2xl border p-4 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none sm:aspect-square sm:min-h-0";

    const trigger = href ? (
        <Link href={href} className={className}>
            {body}
        </Link>
    ) : (
        <button type="button" onClick={onClick} className={className}>
            {body}
        </button>
    );

    return (
        <Tooltip>
            <TooltipTrigger asChild>{trigger}</TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-72">
                <div className="space-y-1 text-left">
                    <p>{description}</p>
                    {items.length > VISIBLE_ITEMS && (
                        <p className="opacity-80">{items.join(", ")}</p>
                    )}
                </div>
            </TooltipContent>
        </Tooltip>
    );
}

export function SettingsTileGrid({ children }: { children: ReactNode }) {
    return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{children}</div>;
}
