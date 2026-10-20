"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Plus } from "lucide-react";
import { toast } from "sonner";

import { getApiErrorCode, getApiErrorMessage } from "@workspace/api-client/core";
import { Button, Card, ConfirmDialog } from "@workspace/ui";

import { usePermissions } from "@/modules/entities/access";
import {
    isTaxRateErrorCode,
    type TaxRate,
    useArchiveTaxRate,
    useMakeDefaultTaxRate,
    useTaxRateLabel,
    useTaxRates,
} from "@/modules/entities/finance";
import { PageSpinner } from "@/modules/shared/ui";

import { TaxRateDialog } from "./tax-rate-dialog";
import { TaxRateRow } from "./tax-rate-row";

/**
 * Ставки налога клуба: пресет Испании и свои. Ставкой по умолчанию облагаются товары без своей
 * ставки; её и ставку товаров API в архив не пускает — CRM объясняет почему.
 */
export function TaxRatesCard() {
    const t = useTranslations("crm.finance.taxRates");
    const { can } = usePermissions();
    const canEdit = can("finance.admin");
    const label = useTaxRateLabel();
    const rates = useTaxRates();
    const makeDefault = useMakeDefaultTaxRate();
    const archive = useArchiveTaxRate();
    const [editing, setEditing] = useState<TaxRate | "new" | null>(null);
    const [archiving, setArchiving] = useState<TaxRate | null>(null);
    const busy = makeDefault.isPending || archive.isPending;

    const failed = (error: unknown) => {
        const code = getApiErrorCode(error);
        toast.error(isTaxRateErrorCode(code) ? t(`errors.${code}`) : getApiErrorMessage(error));
    };

    const confirmArchive = () => {
        if (!archiving) return;
        archive.mutate(archiving.id, {
            onSuccess: () => toast.success(t("archived")),
            onError: failed,
            onSettled: () => setArchiving(null),
        });
    };

    return (
        <Card padding="md" className="max-w-3xl" contentClassName="space-y-2 px-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <h2 className="font-semibold">{t("title")}</h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">{t("hint")}</p>
                </div>
                {canEdit && (
                    <Button size="sm" variant="outline" onClick={() => setEditing("new")}>
                        <Plus aria-hidden="true" />
                        {t("add")}
                    </Button>
                )}
            </div>
            {rates.isLoading ? (
                <PageSpinner />
            ) : (
                <ul className="divide-y">
                    {rates.data?.map((rate) => (
                        <TaxRateRow
                            key={rate.id}
                            rate={rate}
                            canEdit={canEdit}
                            busy={busy}
                            onEdit={() => setEditing(rate)}
                            onMakeDefault={() =>
                                makeDefault.mutate(rate.id, {
                                    onSuccess: () => toast.success(t("defaultChanged")),
                                    onError: failed,
                                })
                            }
                            onArchive={() => setArchiving(rate)}
                        />
                    ))}
                </ul>
            )}
            <TaxRateDialog
                open={editing !== null}
                onOpenChange={(open) => !open && setEditing(null)}
                rate={editing === "new" || editing === null ? undefined : editing}
            />
            <ConfirmDialog
                open={archiving !== null}
                onOpenChange={(open) => !open && setArchiving(null)}
                title={t("archiveTitle")}
                description={
                    archiving ? t("archiveDescription", { name: label(archiving) }) : undefined
                }
                confirmLabel={t("archive")}
                cancelLabel={t("cancel")}
                onConfirm={confirmArchive}
                pending={archive.isPending}
                tone="destructive"
            />
        </Card>
    );
}
