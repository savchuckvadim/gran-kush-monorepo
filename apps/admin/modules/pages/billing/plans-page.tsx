"use client";

import { useLocale, useTranslations } from "next-intl";

import { EyeOff } from "lucide-react";

import { Card } from "@workspace/ui";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@workspace/ui/components/table";

import { useBillingFormat, useBillingPlans } from "@/modules/entities/billing";
import { CreatePlanDialog, EditPlanDialog } from "@/modules/features/billing";
import { CRM_PUBLIC_URL } from "@/modules/shared/config/routes";
import { Badge } from "@/modules/shared/ui/Badge";

import { ListStatus } from "./list-status";

export function PlansPage() {
    const t = useTranslations("billing.plans");
    const locale = useLocale();
    const format = useBillingFormat();
    const { data: plans = [], isLoading, error, refetch } = useBillingPlans();

    const hiddenPlanLink = `${CRM_PUBLIC_URL}/${locale}/{club}/crm/settings/billing?plan={code}`;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-3xl">
                    <h1 className="text-2xl font-semibold">{t("title")}</h1>
                    <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
                </div>
                <CreatePlanDialog />
            </div>

            <div className="flex gap-3 rounded-lg border bg-muted/30 p-4 text-sm">
                <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 space-y-1">
                    <p className="font-medium">{t("hiddenHintTitle")}</p>
                    <p className="text-muted-foreground">{t("hiddenHint")}</p>
                    <code className="block break-all rounded bg-muted px-2 py-1 font-mono text-xs">
                        {hiddenPlanLink}
                    </code>
                </div>
            </div>

            <Card className="p-0" contentClassName="p-0">
                {isLoading || error || plans.length === 0 ? (
                    <ListStatus
                        isLoading={isLoading}
                        error={error}
                        onRetry={() => void refetch()}
                        emptyText={t("empty")}
                    />
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/40 text-xs text-muted-foreground">
                                <TableHead className="px-3">{t("columns.code")}</TableHead>
                                <TableHead className="px-3">{t("columns.name")}</TableHead>
                                <TableHead className="px-3">{t("columns.price")}</TableHead>
                                <TableHead className="px-3">{t("columns.visibility")}</TableHead>
                                <TableHead className="px-3">{t("columns.state")}</TableHead>
                                <TableHead className="px-3">{t("columns.stripePriceId")}</TableHead>
                                <TableHead className="px-3" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {plans.map((plan) => (
                                <TableRow key={plan.code}>
                                    <TableCell className="px-3 font-mono text-xs">
                                        {plan.code}
                                    </TableCell>
                                    <TableCell className="px-3 font-medium">{plan.name}</TableCell>
                                    <TableCell className="px-3">{format.price(plan)}</TableCell>
                                    <TableCell className="px-3">
                                        {plan.isPublic ? (
                                            <Badge tone="info">{t("public")}</Badge>
                                        ) : (
                                            <Badge>{t("hidden")}</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="px-3">
                                        {plan.isActive ? (
                                            <Badge tone="success">{t("active")}</Badge>
                                        ) : (
                                            <Badge>{t("archived")}</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="px-3 font-mono text-xs text-muted-foreground">
                                        {plan.stripePriceId ?? "—"}
                                    </TableCell>
                                    <TableCell className="px-3 text-right">
                                        <EditPlanDialog plan={plan} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Card>
        </div>
    );
}
