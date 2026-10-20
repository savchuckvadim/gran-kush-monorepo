"use client";

import { useTranslations } from "next-intl";

import { Archive, Pencil } from "lucide-react";

import { Badge, Button } from "@workspace/ui";

import type { Counterparty } from "@/modules/entities/finance";

interface CounterpartyRowProps {
    counterparty: Counterparty;
    canWrite: boolean;
    onEdit: (counterparty: Counterparty) => void;
    onArchive: (counterparty: Counterparty) => void;
    onOpenEntries: (counterparty: Counterparty) => void;
}

/** Контрагент: имя, вид, NIF, сколько проводок; участника меняют в его карточке. */
export function CounterpartyRow({
    counterparty,
    canWrite,
    onEdit,
    onArchive,
    onOpenEntries,
}: CounterpartyRowProps) {
    const t = useTranslations("crm.finance.counterparties");
    const manual = counterparty.kind !== "member";
    return (
        <tr className="border-b text-sm last:border-b-0">
            <td className="px-3 py-2">
                <span className="block truncate">{counterparty.name ?? t("deletedMember")}</span>
                {counterparty.notes && (
                    <span className="block truncate text-xs text-muted-foreground">
                        {counterparty.notes}
                    </span>
                )}
            </td>
            <td className="hidden px-3 py-2 sm:table-cell">
                <Badge variant="secondary">{t(`kinds.${counterparty.kind}`)}</Badge>
            </td>
            <td className="hidden px-3 py-2 font-mono text-xs md:table-cell">
                {[
                    counterparty.nif,
                    counterparty.country && counterparty.country !== "ES"
                        ? counterparty.country
                        : null,
                ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
            </td>
            <td className="px-3 py-2 text-right">
                <Button
                    variant="link"
                    size="sm"
                    disabled={counterparty.entryCount === 0}
                    onClick={() => onOpenEntries(counterparty)}
                >
                    {t("entries", { count: counterparty.entryCount })}
                </Button>
            </td>
            <td className="px-3 py-2 text-right whitespace-nowrap">
                {canWrite && manual && (
                    <>
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t("edit")}
                            onClick={() => onEdit(counterparty)}
                        >
                            <Pencil aria-hidden="true" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t("archive")}
                            onClick={() => onArchive(counterparty)}
                        >
                            <Archive aria-hidden="true" />
                        </Button>
                    </>
                )}
            </td>
        </tr>
    );
}
