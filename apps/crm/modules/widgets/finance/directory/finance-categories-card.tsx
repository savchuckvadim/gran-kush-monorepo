"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button, Card, ConfirmDialog, Label, Switch } from "@workspace/ui";

import { usePermissions } from "@/modules/entities/access";
import {
    type FinanceCategory,
    useArchiveFinanceCategory,
    useFinanceCategories,
    useFinanceCategoryLabel,
    useLedgerErrorText,
} from "@/modules/entities/finance";
import { FinanceCategoryDialog } from "@/modules/features/finance-category-form";
import { CardHeading } from "@/modules/shared/ui";

import { FinanceCategoryRow } from "./finance-category-row";

const DIRECTIONS = ["income", "expense"] as const;

/** Статьи доходов и расходов клуба: пресет по типу клуба и свои. Настраивает `finance.admin`. */
export function FinanceCategoriesCard() {
    const t = useTranslations("crm.finance.categories");
    const label = useFinanceCategoryLabel();
    const { can } = usePermissions();
    const canAdmin = can("finance.admin");
    const [showArchived, setShowArchived] = useState(false);
    const categories = useFinanceCategories({ includeArchived: showArchived }).data ?? [];
    const archive = useArchiveFinanceCategory();
    const errorText = useLedgerErrorText();
    const [editing, setEditing] = useState<FinanceCategory | undefined>();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [archiving, setArchiving] = useState<FinanceCategory | null>(null);

    return (
        <Card padding="md" className="max-w-3xl" contentClassName="space-y-4 px-0">
            <CardHeading
                title={t("title")}
                hint={t("hint")}
                actions={
                    canAdmin && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                                setEditing(undefined);
                                setDialogOpen(true);
                            }}
                        >
                            <Plus aria-hidden="true" />
                            {t("add")}
                        </Button>
                    )
                }
            />
            <div className="flex flex-wrap items-center justify-end gap-3">
                <div className="flex items-center gap-2">
                    <Switch
                        id="categories-archived"
                        checked={showArchived}
                        onCheckedChange={setShowArchived}
                    />
                    <Label htmlFor="categories-archived" className="text-sm font-normal">
                        {t("showArchived")}
                    </Label>
                </div>
            </div>
            {DIRECTIONS.map((direction) => (
                <section key={direction} className="space-y-1">
                    <h3 className="text-sm font-medium">{t(direction)}</h3>
                    <ul className="divide-y">
                        {categories
                            .filter((category) => category.direction === direction)
                            .map((category) => (
                                <FinanceCategoryRow
                                    key={category.id}
                                    category={category}
                                    canAdmin={canAdmin}
                                    onEdit={(item) => {
                                        setEditing(item);
                                        setDialogOpen(true);
                                    }}
                                    onArchive={setArchiving}
                                />
                            ))}
                    </ul>
                </section>
            ))}
            <FinanceCategoryDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                category={editing}
            />
            <ConfirmDialog
                open={archiving !== null}
                onOpenChange={(open) => !open && setArchiving(null)}
                title={t("archiveTitle", { name: archiving ? label(archiving) : "" })}
                description={t("archiveHint")}
                confirmLabel={t("archive")}
                cancelLabel={t("cancel")}
                pending={archive.isPending}
                onConfirm={() =>
                    archiving &&
                    archive.mutate(archiving.id, {
                        onSuccess: () => {
                            toast.success(t("archived"));
                            setArchiving(null);
                        },
                        onError: (error) => toast.error(errorText(error)),
                    })
                }
            />
        </Card>
    );
}
