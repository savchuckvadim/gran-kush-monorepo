"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Search } from "lucide-react";

import { Card, Input } from "@workspace/ui";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@workspace/ui/components/table";

import {
    type ClubSubscriptionRow,
    isManagedByStripe,
    SubscriptionStatusBadge,
    useBillingFormat,
    useClubSubscriptions,
} from "@/modules/entities/billing";
import { ManualPaymentDialog, TrialEndDialog } from "@/modules/features/billing";

import { ListStatus } from "./list-status";

const matchesQuery = (club: ClubSubscriptionRow, query: string): boolean =>
    club.portalDisplayName.toLowerCase().includes(query) ||
    club.portalName.toLowerCase().includes(query);

function ClubRow({ club }: { club: ClubSubscriptionRow }) {
    const t = useTranslations("billing");
    const format = useBillingFormat();
    const subscription = club.subscription;
    const managedByStripe = isManagedByStripe(subscription);
    const provider =
        subscription?.provider === "stripe" || subscription?.provider === "manual"
            ? subscription.provider
            : "none";

    return (
        <TableRow>
            <TableCell className="px-3">
                <div className="font-medium">{club.portalDisplayName}</div>
                <div className="font-mono text-xs text-muted-foreground">{club.portalName}</div>
                <div className="text-xs text-muted-foreground">
                    {t("clubs.since", { date: format.date(club.portalCreatedAt) ?? "—" })}
                </div>
            </TableCell>
            <TableCell className="px-3">
                {subscription ? (
                    <>
                        <div>{subscription.plan.name}</div>
                        <div className="text-xs text-muted-foreground">
                            {format.price(subscription.plan)}
                        </div>
                    </>
                ) : (
                    "—"
                )}
            </TableCell>
            <TableCell className="px-3">
                <SubscriptionStatusBadge status={subscription?.status ?? null} />
                {subscription?.cancelAtPeriodEnd ? (
                    <div className="mt-1 max-w-40 text-xs whitespace-normal text-muted-foreground">
                        {t("clubs.cancelAtPeriodEnd")}
                    </div>
                ) : null}
            </TableCell>
            <TableCell className="px-3">
                {format.date(subscription?.trialEndsAt ?? null) ?? "—"}
            </TableCell>
            <TableCell className="px-3">
                {format.date(subscription?.currentPeriodEnd ?? null) ?? "—"}
            </TableCell>
            <TableCell className="px-3">
                {format.date(subscription?.graceEndsAt ?? null) ?? "—"}
            </TableCell>
            <TableCell className="px-3">{t(`provider.${provider}`)}</TableCell>
            <TableCell className="px-3">
                <div
                    className="ml-auto flex w-fit flex-col items-stretch gap-1 text-center"
                    title={
                        managedByStripe
                            ? t("clubs.managedByStripe")
                            : subscription
                              ? undefined
                              : t("clubs.noSubscriptionHint")
                    }
                >
                    <ManualPaymentDialog club={club} disabled={managedByStripe} />
                    <TrialEndDialog club={club} disabled={managedByStripe} />
                    {managedByStripe ? (
                        <span className="text-xs text-muted-foreground">
                            {t("clubs.managedByStripe")}
                        </span>
                    ) : null}
                </div>
            </TableCell>
        </TableRow>
    );
}

export function ClubsPage() {
    const t = useTranslations("billing.clubs");
    const { data: clubs = [], isLoading, error, refetch } = useClubSubscriptions();
    const [query, setQuery] = useState("");

    const normalizedQuery = query.trim().toLowerCase();
    const visibleClubs = useMemo(
        () =>
            normalizedQuery ? clubs.filter((club) => matchesQuery(club, normalizedQuery)) : clubs,
        [clubs, normalizedQuery]
    );

    const emptyText = clubs.length === 0 ? t("empty") : t("notFound");

    return (
        <div className="space-y-6">
            <div className="max-w-3xl">
                <h1 className="text-2xl font-semibold">{t("title")}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
            </div>

            <div className="relative max-w-sm">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={t("search")}
                    aria-label={t("search")}
                    className="pl-8"
                />
            </div>

            <Card className="p-0" contentClassName="p-0">
                {isLoading || error || visibleClubs.length === 0 ? (
                    <ListStatus
                        isLoading={isLoading}
                        error={error}
                        onRetry={() => void refetch()}
                        emptyText={emptyText}
                    />
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/40 text-xs text-muted-foreground">
                                <TableHead className="px-3">{t("columns.club")}</TableHead>
                                <TableHead className="px-3">{t("columns.plan")}</TableHead>
                                <TableHead className="px-3">{t("columns.status")}</TableHead>
                                <TableHead className="px-3">{t("columns.trialEndsAt")}</TableHead>
                                <TableHead className="px-3">
                                    {t("columns.currentPeriodEnd")}
                                </TableHead>
                                <TableHead className="px-3">{t("columns.graceEndsAt")}</TableHead>
                                <TableHead className="px-3">{t("columns.provider")}</TableHead>
                                <TableHead className="px-3" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visibleClubs.map((club) => (
                                <ClubRow key={club.portalId} club={club} />
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Card>
        </div>
    );
}
