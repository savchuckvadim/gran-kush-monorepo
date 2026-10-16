"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { ExternalLink, Trash2 } from "lucide-react";

import { getApiErrorMessage, type SchemaAccountDocumentDto } from "@workspace/api-client/core";
import { Button, Card, ConfirmDialog } from "@workspace/ui";

import {
    documentPreviewUrl,
    useDeleteDocument,
    useToggleDocumentShare,
} from "@/modules/entities/cabinet-passport";

import { ClubShareList, type ShareClub } from "./club-share-list";
import { sharedIdsOf } from "./shared-ids";
import { Thumbnail } from "./thumbnail";

/** Документ аккаунта: превью, номер, удаление и каким клубам он показан. */
export function DocumentCard({
    document,
    clubs,
}: {
    document: SchemaAccountDocumentDto;
    clubs: ShareClub[];
}) {
    const t = useTranslations("cabinet.passport");
    const toggle = useToggleDocumentShare();
    const remove = useDeleteDocument();
    const [confirmDelete, setConfirmDelete] = useState(false);

    // Тип документа — свободная строка (клуб мог загрузить свой): неизвестный показываем как есть
    const typeLabel = t.has(`types.${document.type}`) ? t(`types.${document.type}`) : document.type;
    const label = `${typeLabel} · ${t(`sides.${document.side}`)}`;

    return (
        <Card>
            <div className="space-y-4 px-4">
                <div className="flex items-start gap-3">
                    <Thumbnail src={documentPreviewUrl(document.id)} alt={label} />
                    <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{label}</p>
                        {document.number && (
                            <p className="truncate text-sm text-muted-foreground">
                                № {document.number}
                            </p>
                        )}
                        <a
                            href={documentPreviewUrl(document.id)}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                            <ExternalLink className="size-3.5" aria-hidden="true" />
                            {t("open")}
                        </a>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t("delete")}
                        title={t("delete")}
                        onClick={() => setConfirmDelete(true)}
                    >
                        <Trash2 />
                    </Button>
                </div>

                <section className="space-y-2">
                    <h3 className="text-sm font-medium">{t("shownTo")}</h3>
                    <ClubShareList
                        clubs={clubs}
                        sharedIds={sharedIdsOf(document.sharedWith)}
                        staleIds={sharedIdsOf(document.staleSharedWith)}
                        disabled={toggle.isPending}
                        onToggle={(memberId, shared) =>
                            toggle.mutate({ documentId: document.id, memberId, shared })
                        }
                    />
                    {toggle.error && (
                        <p role="alert" className="text-sm text-destructive">
                            {getApiErrorMessage(toggle.error)}
                        </p>
                    )}
                </section>
            </div>

            <ConfirmDialog
                open={confirmDelete}
                onOpenChange={setConfirmDelete}
                title={t("deleteTitle")}
                description={t("deleteText")}
                confirmLabel={t("deleteConfirm")}
                cancelLabel={t("cancel")}
                pending={remove.isPending}
                tone="destructive"
                onConfirm={() =>
                    remove.mutate(document.id, { onSettled: () => setConfirmDelete(false) })
                }
            />
        </Card>
    );
}
