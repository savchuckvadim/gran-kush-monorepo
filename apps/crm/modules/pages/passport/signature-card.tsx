"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { FileText, PenLine } from "lucide-react";

import { getApiErrorMessage, type SchemaSharedClubDto } from "@workspace/api-client/core";
import { Button, Card, ConfirmDialog } from "@workspace/ui";

import {
    signaturePreviewUrl,
    useDeleteSignature,
    usePutSignature,
    useToggleSignatureShare,
} from "@/modules/entities/cabinet-passport";

import { ClubShareList, type ShareClub } from "./club-share-list";
import { DrawSignatureDialog } from "./draw-signature-dialog";
import { fileToDataUrl, MAX_SIGNATURE_BYTES, SIGNATURE_ACCEPT } from "./file-to-data-url";
import { sharedIdsOf } from "./shared-ids";
import { Thumbnail } from "./thumbnail";

/** Подпись аккаунта: загрузить файлом или нарисовать, заменить, удалить и показать клубам. */
export function SignatureCard({
    hasSignature,
    sharedWith,
    clubs,
}: {
    hasSignature: boolean;
    sharedWith: SchemaSharedClubDto[];
    clubs: ShareClub[];
}) {
    const t = useTranslations("cabinet.passport");
    const input = useRef<HTMLInputElement>(null);
    const put = usePutSignature();
    const remove = useDeleteSignature();
    const toggle = useToggleSignatureShare();
    const [localError, setLocalError] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [drawing, setDrawing] = useState(false);
    // Адрес с отметкой времени обходит кэш браузера после замены подписи
    const [version, setVersion] = useState(0);

    const pick = async (file: File | undefined) => {
        if (!file) return;
        if (file.size > MAX_SIGNATURE_BYTES) {
            setLocalError(t("signature.tooBig"));
            return;
        }
        setLocalError(null);
        put.mutate(await fileToDataUrl(file), { onSuccess: () => setVersion((v) => v + 1) });
    };

    const error = localError ?? (put.error ? getApiErrorMessage(put.error) : null);

    return (
        <Card>
            <div className="space-y-4 px-4">
                <div className="flex items-start gap-3">
                    {hasSignature ? (
                        <Thumbnail
                            key={version}
                            src={`${signaturePreviewUrl()}?v=${version}`}
                            alt={t("signature.title")}
                        />
                    ) : (
                        <span className="flex size-16 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground">
                            <FileText className="size-6" aria-hidden="true" />
                        </span>
                    )}
                    <div className="min-w-0 flex-1">
                        <h2 className="font-medium">{t("signature.title")}</h2>
                        <p className="text-sm text-muted-foreground">
                            {hasSignature ? t("signature.have") : t("signature.none")}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={put.isPending}
                                onClick={() => input.current?.click()}
                            >
                                {hasSignature ? t("signature.replace") : t("signature.upload")}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setDrawing(true)}>
                                <PenLine aria-hidden="true" />
                                {t("signature.draw")}
                            </Button>
                            {hasSignature && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setConfirmDelete(true)}
                                >
                                    {t("delete")}
                                </Button>
                            )}
                        </div>
                        <input
                            ref={input}
                            type="file"
                            accept={SIGNATURE_ACCEPT}
                            className="hidden"
                            onChange={(event) => {
                                void pick(event.target.files?.[0]);
                                event.target.value = "";
                            }}
                        />
                    </div>
                </div>

                {error && (
                    <p role="alert" className="text-sm text-destructive">
                        {error}
                    </p>
                )}

                {hasSignature && (
                    <section className="space-y-2">
                        <h3 className="text-sm font-medium">{t("shownTo")}</h3>
                        <ClubShareList
                            clubs={clubs}
                            sharedIds={sharedIdsOf(sharedWith)}
                            disabled={toggle.isPending}
                            onToggle={(memberId, shared) => toggle.mutate({ memberId, shared })}
                        />
                    </section>
                )}
            </div>

            <DrawSignatureDialog
                open={drawing}
                onOpenChange={setDrawing}
                onSaved={() => setVersion((v) => v + 1)}
            />

            <ConfirmDialog
                open={confirmDelete}
                onOpenChange={setConfirmDelete}
                title={t("signature.deleteTitle")}
                description={t("signature.deleteText")}
                confirmLabel={t("deleteConfirm")}
                cancelLabel={t("cancel")}
                pending={remove.isPending}
                tone="destructive"
                onConfirm={() =>
                    remove.mutate(undefined, { onSettled: () => setConfirmDelete(false) })
                }
            />
        </Card>
    );
}
