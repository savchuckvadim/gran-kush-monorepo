"use client";

import { useTranslations } from "next-intl";

import { AlertTriangle } from "lucide-react";

import { Button, Switch } from "@workspace/ui";

export interface ShareClub {
    memberId: string;
    displayName: string;
}

interface ClubShareListProps {
    clubs: ShareClub[];
    /** Клубы, которым показан этот файл. */
    sharedIds: ReadonlySet<string>;
    /** Клубы, которые видят прежнюю версию: владельцу нужно обновить показ. */
    staleIds?: ReadonlySet<string>;
    disabled?: boolean;
    onToggle: (memberId: string, shared: boolean) => void;
}

/**
 * Кому показан файл: по переключателю на каждый клуб. Клуб, который видит прежнюю версию
 * документа, отмечен отдельно с кнопкой «показать новую». Выключатель мгновенно отзывает показ,
 * и клуб перестаёт видеть файл.
 */
export function ClubShareList({
    clubs,
    sharedIds,
    staleIds,
    disabled,
    onToggle,
}: ClubShareListProps) {
    const t = useTranslations("cabinet.passport");

    if (clubs.length === 0) {
        return <p className="text-sm text-muted-foreground">{t("noClubs")}</p>;
    }

    return (
        <ul className="divide-y rounded-lg border">
            {clubs.map((club) => {
                const stale = staleIds?.has(club.memberId) === true;
                return (
                    <li
                        key={club.memberId}
                        className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                    >
                        <div className="min-w-0">
                            <p className="truncate font-medium">{club.displayName}</p>
                            {stale && (
                                <p className="flex items-center gap-1 text-xs text-warning">
                                    <AlertTriangle
                                        className="size-3.5 shrink-0"
                                        aria-hidden="true"
                                    />
                                    {t("stale")}
                                </p>
                            )}
                        </div>
                        {stale ? (
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={disabled}
                                onClick={() => onToggle(club.memberId, true)}
                            >
                                {t("showNew")}
                            </Button>
                        ) : (
                            <Switch
                                checked={sharedIds.has(club.memberId)}
                                disabled={disabled}
                                onCheckedChange={(on) => onToggle(club.memberId, on)}
                                aria-label={club.displayName}
                            />
                        )}
                    </li>
                );
            })}
        </ul>
    );
}
