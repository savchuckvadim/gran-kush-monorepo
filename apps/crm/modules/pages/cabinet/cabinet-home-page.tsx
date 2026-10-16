"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { ChevronRight, Loader2 } from "lucide-react";

import type { SchemaMyMembershipDto } from "@workspace/api-client/core";
import { Badge, Button, Card } from "@workspace/ui";

import { useMyMemberships } from "@/modules/entities/membership";
import { useCabinetLinks } from "@/modules/processes/member-auth";
import { ClubBadge } from "@/modules/shared/ui/Brand";

import { ConfirmMembershipDialog } from "./confirm-membership-dialog";

/**
 * Дом кабинета: сначала то, что требует ответа (клубы, которые добавили аккаунт и ждут
 * подтверждения), ниже — клубы, где участник состоит. Если клубов нет, объясняет, как вступить.
 */
export function CabinetHomePage() {
    const t = useTranslations("cabinet.home");
    const links = useCabinetLinks();
    const { data: memberships = [], isLoading, isError } = useMyMemberships();
    const [reviewing, setReviewing] = useState<SchemaMyMembershipDto | null>(null);

    if (isLoading) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
        );
    }

    if (isError) {
        return (
            <p role="alert" className="text-sm text-destructive">
                {t("loadError")}
            </p>
        );
    }

    const pending = memberships.filter((m) => m.consentStatus === "pending");
    const clubs = memberships.filter((m) => m.consentStatus === "confirmed" && m.isActive);

    return (
        <div className="space-y-8">
            <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>

            {pending.length > 0 && (
                <section aria-labelledby="pending-title" className="space-y-3">
                    <h2 id="pending-title" className="text-lg font-medium">
                        {t("pendingTitle")}
                    </h2>
                    <p className="text-sm text-muted-foreground">{t("pendingHint")}</p>
                    <ul className="grid gap-3 sm:grid-cols-2">
                        {pending.map((membership) => (
                            <li key={membership.memberId}>
                                <Card className="h-full">
                                    <div className="flex items-center gap-3 px-4">
                                        <ClubBadge
                                            name={membership.displayName}
                                            className="size-10"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-medium">
                                                {membership.displayName}
                                            </p>
                                            <Badge variant="outline">
                                                {membership.consentExpired
                                                    ? t("expired")
                                                    : t("awaiting")}
                                            </Badge>
                                        </div>
                                        <Button size="sm" onClick={() => setReviewing(membership)}>
                                            {t("review")}
                                        </Button>
                                    </div>
                                </Card>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <section aria-labelledby="clubs-title" className="space-y-3">
                <h2 id="clubs-title" className="text-lg font-medium">
                    {t("clubsTitle")}
                </h2>
                {clubs.length === 0 ? (
                    <Card>
                        <div className="space-y-1 px-4">
                            <p className="font-medium">{t("emptyTitle")}</p>
                            <p className="text-sm text-muted-foreground">{t("emptyText")}</p>
                        </div>
                    </Card>
                ) : (
                    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {clubs.map((club) => (
                            <li key={club.memberId}>
                                <Link
                                    href={links.club(club.slug)}
                                    className="group block h-full rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                                >
                                    <Card className="h-full transition-colors group-hover:bg-accent/40">
                                        <div className="flex items-center gap-3 px-4">
                                            <ClubBadge
                                                name={club.displayName}
                                                className="size-10"
                                            />
                                            <p className="min-w-0 flex-1 truncate font-medium">
                                                {club.displayName}
                                            </p>
                                            <ChevronRight
                                                className="size-4 shrink-0 text-muted-foreground"
                                                aria-hidden="true"
                                            />
                                        </div>
                                    </Card>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {reviewing && (
                <ConfirmMembershipDialog
                    membership={reviewing}
                    open
                    onOpenChange={(open) => {
                        if (!open) setReviewing(null);
                    }}
                />
            )}
        </div>
    );
}
