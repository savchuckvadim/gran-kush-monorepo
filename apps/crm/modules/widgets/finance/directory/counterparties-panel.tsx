"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button, Card, ConfirmDialog } from "@workspace/ui";

import { usePermissions } from "@/modules/entities/access";
import {
    type Counterparty,
    useArchiveCounterparty,
    useCounterparties,
    useLedgerErrorText,
} from "@/modules/entities/finance";
import { CounterpartyDialog } from "@/modules/features/counterparty-form";
import { CardHeading } from "@/modules/shared/ui";
import { PageSpinner } from "@/modules/shared/ui/Loading/PageSpinner";

import { CounterpartyRow } from "./counterparty-row";

/** Справочник контрагентов: поставщики, клиенты, госорганы и участники, на кого записан доход. */
export function CounterpartiesPanel({
    onOpenEntries,
}: {
    onOpenEntries: (counterparty: Counterparty) => void;
}) {
    const t = useTranslations("crm.finance.counterparties");
    const { can } = usePermissions();
    const canWrite = can("finance.write");
    const counterparties = useCounterparties();
    const archive = useArchiveCounterparty();
    const errorText = useLedgerErrorText();
    const [editing, setEditing] = useState<Counterparty | undefined>();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [archiving, setArchiving] = useState<Counterparty | null>(null);
    const list = counterparties.data ?? [];

    return (
        <Card contentClassName="space-y-3 px-0">
            <CardHeading
                title={t("title")}
                hint={t("hint")}
                actions={
                    canWrite && (
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
            {counterparties.isLoading && <PageSpinner />}
            {counterparties.isSuccess && list.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">{t("empty")}</p>
            )}
            {list.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <tbody>
                            {list.map((counterparty) => (
                                <CounterpartyRow
                                    key={counterparty.id}
                                    counterparty={counterparty}
                                    canWrite={canWrite}
                                    onOpenEntries={onOpenEntries}
                                    onEdit={(party) => {
                                        setEditing(party);
                                        setDialogOpen(true);
                                    }}
                                    onArchive={setArchiving}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <CounterpartyDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                counterparty={editing}
            />
            <ConfirmDialog
                open={archiving !== null}
                onOpenChange={(open) => !open && setArchiving(null)}
                title={t("archiveTitle", { name: archiving?.name ?? "" })}
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
