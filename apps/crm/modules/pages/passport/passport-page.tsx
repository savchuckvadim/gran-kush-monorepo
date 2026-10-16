"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { ExternalLink, FileText, Loader2, Plus, Trash2 } from "lucide-react";

import {
    getApiErrorMessage,
    type SchemaAccountDocumentDto,
    type SchemaSharedClubDto,
} from "@workspace/api-client/core";
import { Button, Card, ConfirmDialog } from "@workspace/ui";

import {
    documentPreviewUrl,
    signaturePreviewUrl,
    useDeleteDocument,
    useDeleteSignature,
    usePutSignature,
    useToggleDocumentShare,
    useToggleSignatureShare,
} from "@/modules/entities/lk-passport";
import { useAccountDocuments, useMyMemberships } from "@/modules/entities/membership";

import { ClubShareList, type ShareClub } from "./club-share-list";
import { fileToDataUrl, MAX_SIGNATURE_BYTES, SIGNATURE_ACCEPT } from "./file-to-data-url";
import { UploadDocumentDialog } from "./upload-document-dialog";

const idsOf = (clubs: SchemaSharedClubDto[]): ReadonlySet<string> =>
    new Set(clubs.map((club) => club.memberId));

/** Миниатюра файла; PDF и недоступный файл показывают значок, а «Открыть» ведёт к полному файлу. */
function Thumbnail({ src, alt }: { src: string; alt: string }) {
    const [broken, setBroken] = useState(false);

    if (broken) {
        return (
            <span className="flex size-16 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground">
                <FileText className="size-6" aria-hidden="true" />
            </span>
        );
    }
    return (
        // eslint-disable-next-line @next/next/no-img-element -- файл приватный, отдаётся API с куками
        <img
            src={src}
            alt={alt}
            onError={() => setBroken(true)}
            className="size-16 shrink-0 rounded-md border object-cover"
            crossOrigin="use-credentials"
        />
    );
}

function DocumentCard({
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
                        sharedIds={idsOf(document.sharedWith)}
                        staleIds={idsOf(document.staleSharedWith)}
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

function SignatureCard({
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
                            sharedIds={idsOf(sharedWith)}
                            disabled={toggle.isPending}
                            onToggle={(memberId, shared) => toggle.mutate({ memberId, shared })}
                        />
                    </section>
                )}
            </div>

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

/**
 * «Мой паспорт»: документы и подпись аккаунта и то, каким клубам они показаны. Загрузка клубам
 * ничего не открывает — каждый показ включается здесь, переключателем на клуб, и отзывается им же.
 */
export function PassportPage() {
    const t = useTranslations("cabinet.passport");
    const [uploading, setUploading] = useState(false);
    const { data: account, isLoading, isError } = useAccountDocuments();
    const { data: memberships = [] } = useMyMemberships();

    const clubs: ShareClub[] = memberships
        .filter((m) => m.consentStatus === "confirmed" && m.isActive)
        .map((m) => ({ memberId: m.memberId, displayName: m.displayName }));

    if (isLoading) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
        );
    }
    if (isError || !account) {
        return (
            <p role="alert" className="text-sm text-destructive">
                {t("loadError")}
            </p>
        );
    }

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
                    <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
                </div>
                <Button onClick={() => setUploading(true)}>
                    <Plus aria-hidden="true" />
                    {t("addDocument")}
                </Button>
            </header>

            {account.documents.length === 0 ? (
                <Card>
                    <div className="space-y-1 px-4">
                        <p className="font-medium">{t("emptyTitle")}</p>
                        <p className="text-sm text-muted-foreground">{t("emptyText")}</p>
                    </div>
                </Card>
            ) : (
                <ul className="grid gap-4 lg:grid-cols-2">
                    {account.documents.map((document) => (
                        <li key={document.id}>
                            <DocumentCard document={document} clubs={clubs} />
                        </li>
                    ))}
                </ul>
            )}

            <SignatureCard
                hasSignature={account.hasSignature}
                sharedWith={account.signatureSharedWith}
                clubs={clubs}
            />

            <UploadDocumentDialog open={uploading} onOpenChange={setUploading} />
        </div>
    );
}
