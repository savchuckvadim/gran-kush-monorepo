"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Loader2 } from "lucide-react";

import { getApiErrorMessage, type SchemaMyMembershipDto } from "@workspace/api-client/core";
import { Button, ModalDialog,Switch } from "@workspace/ui";

import {
    useAccountDocuments,
    useConfirmMembership,
    useDeclineMembership,
} from "@/modules/entities/membership";

interface ConfirmMembershipDialogProps {
    membership: SchemaMyMembershipDto;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

/**
 * Клуб добавил этот аккаунт по email и ждёт ответа. Участник подтверждает членство под своей
 * сессией и сам выбирает, какие документы показать клубу: по умолчанию не показывается ничего,
 * показ можно открыть и позже. Отказ удаляет членство.
 */
export function ConfirmMembershipDialog({
    membership,
    open,
    onOpenChange,
}: ConfirmMembershipDialogProps) {
    const t = useTranslations("cabinet.confirm");
    const { data: account, isLoading } = useAccountDocuments(open);
    const confirm = useConfirmMembership();
    const decline = useDeclineMembership();
    const [shared, setShared] = useState<ReadonlySet<string>>(new Set());
    const [shareSignature, setShareSignature] = useState(false);

    const busy = confirm.isPending || decline.isPending;
    const error = confirm.error ?? decline.error;
    const documents = account?.documents ?? [];

    const toggle = (id: string, on: boolean) =>
        setShared((previous) => {
            const next = new Set(previous);
            if (on) next.add(id);
            else next.delete(id);
            return next;
        });

    return (
        <ModalDialog
            open={open}
            onOpenChange={onOpenChange}
            title={t("title", { club: membership.displayName })}
            description={
                membership.consentExpired
                    ? t("expired", { club: membership.displayName })
                    : t("intro", { club: membership.displayName })
            }
            footer={
                <>
                    <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                            decline.mutate(membership.memberId, {
                                onSuccess: () => onOpenChange(false),
                            })
                        }
                    >
                        {decline.isPending ? t("working") : t("decline")}
                    </Button>
                    <Button
                        disabled={busy || membership.consentExpired === true}
                        onClick={() =>
                            confirm.mutate(
                                {
                                    memberId: membership.memberId,
                                    selection: {
                                        shareDocumentIds: Array.from(shared),
                                        shareSignature,
                                    },
                                },
                                { onSuccess: () => onOpenChange(false) }
                            )
                        }
                    >
                        {confirm.isPending ? t("working") : t("confirm")}
                    </Button>
                </>
            }
        >
            <section className="space-y-2">
                <h3 className="text-sm font-medium">{t("documents")}</h3>
                {isLoading ? (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                ) : documents.length === 0 && !account?.hasSignature ? (
                    <p className="text-sm text-muted-foreground">{t("noDocuments")}</p>
                ) : (
                    <ul className="space-y-2">
                        {documents.map((document) => (
                            <li
                                key={document.id}
                                className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                            >
                                <span>
                                    {document.type} · {document.side}
                                </span>
                                <Switch
                                    checked={shared.has(document.id)}
                                    onCheckedChange={(on) => toggle(document.id, on)}
                                    disabled={busy}
                                    aria-label={document.type}
                                />
                            </li>
                        ))}
                        {account?.hasSignature && (
                            <li className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
                                <span>{t("signature")}</span>
                                <Switch
                                    checked={shareSignature}
                                    onCheckedChange={setShareSignature}
                                    disabled={busy}
                                    aria-label={t("signature")}
                                />
                            </li>
                        )}
                    </ul>
                )}
                <p className="text-xs text-muted-foreground">{t("hint")}</p>
            </section>

            {error && (
                <p role="alert" className="text-sm text-destructive">
                    {getApiErrorMessage(error)}
                </p>
            )}
        </ModalDialog>
    );
}
