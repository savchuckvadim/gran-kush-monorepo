"use client";

import { useLocale, useTranslations } from "next-intl";

import { Building2, ChevronRight } from "lucide-react";

import type { SchemaMyPortalDto } from "@workspace/api-client/core";
import { Button } from "@workspace/ui";

import { ROUTES } from "@/modules/shared/config/routes";

interface ClubPickerProps {
    clubs: SchemaMyPortalDto[];
    /** Club from the URL the account does not work in */
    deniedClub: string | null;
    onSignOut: () => void;
    isSigningOut: boolean;
}

export function ClubPicker({ clubs, deniedClub, onSignOut, isSigningOut }: ClubPickerProps) {
    const t = useTranslations("auth.login");
    const locale = useLocale();

    return (
        <div className="space-y-4">
            <div className="space-y-1 text-center">
                <h2 className="text-lg font-semibold">{t("chooseClubTitle")}</h2>
                {clubs.length > 1 && (
                    <p className="text-sm text-muted-foreground">{t("chooseClubSubtitle")}</p>
                )}
            </div>

            {deniedClub && (
                <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                    {t("noAccessToClub", { club: deniedClub })}
                </div>
            )}

            {clubs.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">{t("noClubs")}</p>
            ) : (
                <ul className="space-y-2">
                    {clubs.map((club) => (
                        <li key={club.portalId}>
                            {/* full navigation: the CRM shell starts with a clean client state */}
                            <a
                                href={`/${locale}/${club.slug}${ROUTES.CRM_HOME}`}
                                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted"
                            >
                                <Building2 className="size-5 shrink-0 text-muted-foreground" />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate font-medium">
                                        {club.displayName}
                                    </span>
                                    <span className="block truncate text-xs text-muted-foreground">
                                        {club.slug}
                                    </span>
                                </span>
                                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                            </a>
                        </li>
                    ))}
                </ul>
            )}

            <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={onSignOut}
                disabled={isSigningOut}
            >
                {t("otherAccount")}
            </Button>
        </div>
    );
}
