"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Loader2, Plus } from "lucide-react";

import { Button, Card } from "@workspace/ui";

import { useAccountDocuments, useMyMemberships } from "@/modules/entities/membership";

import { type ShareClub } from "./club-share-list";
import { DocumentCard } from "./document-card";
import { SignatureCard } from "./signature-card";
import { UploadDocumentDialog } from "./upload-document-dialog";

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
