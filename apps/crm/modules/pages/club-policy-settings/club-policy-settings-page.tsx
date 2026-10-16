"use client";

import { useTranslations } from "next-intl";

import { Loader2 } from "lucide-react";

import { getApiErrorMessage } from "@workspace/api-client/core";
import { Card } from "@workspace/ui";

import { useClubPolicy, useUpdateClubPolicy } from "@/modules/entities/club-policy";
import { usePortalRole } from "@/modules/entities/portal";

import { PolicyRow } from "./policy-row";

/**
 * Правила клуба для участников: как вступают без ссылки, открыт ли каталог вне клуба, нужно ли
 * одобрение для заказа, может ли сотрудник заказать на себя. Меняет администратор; остальные видят.
 */
export function ClubPolicySettingsPage() {
    const t = useTranslations("crm.clubPolicy");
    const { isAdmin } = usePortalRole();
    const policy = useClubPolicy();
    const update = useUpdateClubPolicy();

    if (policy.isLoading || !policy.data) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
        );
    }

    const rules = policy.data;
    const disabled = !isAdmin || update.isPending;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">{t("title")}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
            </div>

            {!isAdmin && <p className="text-sm text-muted-foreground">{t("adminOnly")}</p>}
            {update.error && (
                <p role="alert" className="text-sm text-destructive">
                    {getApiErrorMessage(update.error)}
                </p>
            )}

            <Card padding="sm" className="max-w-3xl p-0">
                <ul className="divide-y">
                    <PolicyRow
                        title={t("joinByRequest.title")}
                        description={t("joinByRequest.description")}
                        checked={rules.joinPolicy === "approval"}
                        disabled={disabled}
                        onChange={(on) =>
                            update.mutate({ joinPolicy: on ? "approval" : "link_only" })
                        }
                    />
                    <PolicyRow
                        title={t("catalogOutsideClub.title")}
                        description={t("catalogOutsideClub.description")}
                        checked={rules.catalogOutsideClub}
                        disabled={disabled}
                        onChange={(on) => update.mutate({ catalogOutsideClub: on })}
                    />
                    <PolicyRow
                        title={t("ordersRequireApproval.title")}
                        description={t("ordersRequireApproval.description")}
                        checked={rules.ordersRequireApproval}
                        disabled={disabled}
                        onChange={(on) => update.mutate({ ordersRequireApproval: on })}
                    />
                    <PolicyRow
                        title={t("staffSelfOrders.title")}
                        description={t("staffSelfOrders.description")}
                        checked={rules.staffSelfOrders}
                        disabled={disabled}
                        onChange={(on) => update.mutate({ staffSelfOrders: on })}
                    />
                </ul>
            </Card>
        </div>
    );
}
