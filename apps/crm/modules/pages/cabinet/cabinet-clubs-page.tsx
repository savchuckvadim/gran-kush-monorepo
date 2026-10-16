"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import { Loader2 } from "lucide-react";

import { getApiErrorMessage, type SchemaMyMembershipDto } from "@workspace/api-client/core";
import { Badge, Button, Card, ConfirmDialog } from "@workspace/ui";

import { useLeaveMembership, useMyMemberships } from "@/modules/entities/membership";
import { useCabinetLinks } from "@/modules/processes/member-auth";
import { ClubBadge } from "@/modules/shared/ui/Brand";

import { ConfirmMembershipDialog } from "./confirm-membership-dialog";

type MembershipState = "pending" | "active" | "left";

const stateOf = (membership: SchemaMyMembershipDto): MembershipState =>
    membership.consentStatus === "pending" ? "pending" : membership.isActive ? "active" : "left";

/**
 * Все членства аккаунта с состоянием: действующие, ждущие подтверждения и закрытые. Отсюда
 * же — выход из клуба: членство закрывается, а показ документов клубу отзывается.
 */
export function CabinetClubsPage() {
    const t = useTranslations("cabinet.clubs");
    const locale = useLocale();
    const links = useCabinetLinks();
    const { data: memberships = [], isLoading, isError } = useMyMemberships();
    const leave = useLeaveMembership();
    const [leaving, setLeaving] = useState<SchemaMyMembershipDto | null>(null);
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

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>

            {memberships.length === 0 ? (
                <Card>
                    <p className="px-4 text-sm text-muted-foreground">{t("empty")}</p>
                </Card>
            ) : (
                <ul className="space-y-3">
                    {memberships.map((membership) => {
                        const state = stateOf(membership);
                        return (
                            <li key={membership.memberId}>
                                <Card>
                                    <div className="flex flex-wrap items-center gap-3 px-4">
                                        <ClubBadge
                                            name={membership.displayName}
                                            className="size-10"
                                        />
                                        <div className="min-w-0 flex-1">
                                            {state === "active" ? (
                                                <Link
                                                    href={links.club(membership.slug)}
                                                    className="block truncate font-medium hover:underline"
                                                >
                                                    {membership.displayName}
                                                </Link>
                                            ) : (
                                                <p className="truncate font-medium">
                                                    {membership.displayName}
                                                </p>
                                            )}
                                            <p className="text-xs text-muted-foreground">
                                                {t("since", {
                                                    date: new Intl.DateTimeFormat(locale, {
                                                        dateStyle: "medium",
                                                    }).format(new Date(membership.createdAt)),
                                                })}
                                            </p>
                                        </div>
                                        <Badge variant={state === "active" ? "default" : "outline"}>
                                            {t(`state.${state}`)}
                                        </Badge>
                                        {state === "pending" && (
                                            <Button
                                                size="sm"
                                                onClick={() => setReviewing(membership)}
                                            >
                                                {t("review")}
                                            </Button>
                                        )}
                                        {state === "active" && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setLeaving(membership)}
                                            >
                                                {t("leave")}
                                            </Button>
                                        )}
                                    </div>
                                </Card>
                            </li>
                        );
                    })}
                </ul>
            )}

            {leave.error && (
                <p role="alert" className="text-sm text-destructive">
                    {getApiErrorMessage(leave.error)}
                </p>
            )}

            <ConfirmDialog
                open={leaving !== null}
                onOpenChange={(open) => {
                    if (!open) setLeaving(null);
                }}
                title={t("leaveTitle", { club: leaving?.displayName ?? "" })}
                description={t("leaveText")}
                confirmLabel={t("leaveConfirm")}
                cancelLabel={t("cancel")}
                pending={leave.isPending}
                tone="destructive"
                onConfirm={() => {
                    if (!leaving) return;
                    leave.mutate(leaving.memberId, { onSettled: () => setLeaving(null) });
                }}
            />

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
