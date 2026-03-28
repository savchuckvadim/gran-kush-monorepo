"use client";

import { useRef, useState } from "react";
import { ChangeEvent } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

import { Upload } from "lucide-react";

import { Button, Field } from "@workspace/ui";
import { FieldLabel } from "@workspace/ui/components/field";
import { FieldContent } from "@workspace/ui/components/field";

import { useIdentityDocumentPreview } from "@/modules/entities/member-documents";

export interface IFileUploadProps {
    memberId: string;
    documentId: string;
    currentPreviewUrl: string;
    filePreview: string | null;
    fileInputRef: React.RefObject<HTMLInputElement | null> | null;
    file: File | null;
    setFile: (file: File | null) => void;
    handleFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
}
export const FileUpload = ({
    memberId,
    documentId,
    currentPreviewUrl,
    filePreview,
    fileInputRef,
    file,
    setFile,
    handleFileChange,
}: IFileUploadProps) => {
    const t = useTranslations("crm.members");
    const identityPreview = useIdentityDocumentPreview(memberId, documentId);
    return (
        <Field>
            <FieldLabel>{t("newFile")}</FieldLabel>
            <FieldContent>
                <div className="mb-2 rounded-md border bg-muted/30 p-2">
                    {identityPreview.isLoading ? (
                        <div className="flex h-44 w-full items-center justify-center text-sm text-muted-foreground">
                            Loading...
                        </div>
                    ) : identityPreview.error ? (
                        <div className="flex h-44 w-full items-center justify-center text-sm text-destructive">
                            {identityPreview.error.message}
                        </div>
                    ) : filePreview ? (
                        <Image
                            src={filePreview}
                            alt="document-preview"
                            width={800}
                            height={352}
                            unoptimized
                            className="h-44 w-full object-contain"
                        />
                    ) : identityPreview.previewUrl ? (
                        <Image
                            src={identityPreview.previewUrl}
                            alt="document-preview"
                            width={800}
                            height={352}
                            unoptimized
                            className="h-44 w-full object-contain"
                        />
                    ) : currentPreviewUrl ? (
                        <Image
                            src={currentPreviewUrl}
                            alt="document-preview"
                            width={800}
                            height={352}
                            unoptimized
                            className="h-44 w-full object-contain"
                        />
                    ) : (
                        <div className="flex h-44 w-full items-center justify-center text-sm text-muted-foreground">
                            {t("noIdentityDocuments")}
                        </div>
                    )}
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                />
                <input
                    type="text"
                    readOnly
                    value={file?.name ?? t("currentFileUsed")}
                    className="mb-2 w-full rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground"
                />
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef?.current?.click()}
                >
                    <>
                        <Upload className="mr-2 h-4 w-4" />
                        {t("chooseFile")}
                    </>
                </Button>
            </FieldContent>
        </Field>
    );
};
