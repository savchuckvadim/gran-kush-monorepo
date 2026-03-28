"use client";
import { ChangeEvent } from "react";
import { useTranslations } from "next-intl";

import { Upload } from "lucide-react";

import { Button, Field } from "@workspace/ui";
import { FieldContent, FieldLabel } from "@workspace/ui/components/field";

import { ThemedSignatureImage } from "@/modules/entities/member";
import { useSignaturePreview } from "@/modules/entities/member-documents";

export interface ISignatureUploadProps {
    memberId: string;
    currentPreviewUrl: string;
    filePreview: string | null;
    fileInputRef: React.RefObject<HTMLInputElement | null> | null;
    file: File | null;
    setFile: (file: File | null) => void;
    handleFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
}
export const SignatureUpload = ({
    memberId,
    currentPreviewUrl,
    filePreview,
    fileInputRef,
    file,
    setFile,
    handleFileChange,
}: ISignatureUploadProps) => {
    const t = useTranslations("crm.members");
    const signaturePreview = useSignaturePreview(memberId);

    return (
        <Field>
            <FieldLabel>{t("newFile")}</FieldLabel>
            <FieldContent>
                <div className="mb-2 rounded-md border bg-muted/30 p-2">
                    {signaturePreview.isLoading ? (
                        <div className="flex h-28 w-full items-center justify-center text-sm text-muted-foreground">
                            Loading...
                        </div>
                    ) : signaturePreview.error ? (
                        <div className="flex h-28 w-full items-center justify-center text-sm text-destructive">
                            {signaturePreview.error.message}
                        </div>
                    ) : filePreview ? (
                        <ThemedSignatureImage
                            src={filePreview}
                            alt="signature-preview"
                            className="h-28 w-full object-contain"
                        />
                    ) : signaturePreview.previewUrl ? (
                        <ThemedSignatureImage
                            src={signaturePreview.previewUrl}
                            alt="signature-preview"
                            className="h-28 w-full object-contain"
                        />
                    ) : currentPreviewUrl ? (
                        <ThemedSignatureImage
                            src={currentPreviewUrl}
                            alt="signature-preview"
                            className="h-28 w-full object-contain"
                        />
                    ) : (
                        <div className="flex h-28 w-full items-center justify-center text-sm text-muted-foreground">
                            {t("noSignature")}
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
                    <Upload className="mr-2 h-4 w-4" />
                    {t("chooseFile")}
                </Button>
            </FieldContent>
        </Field>
    );
};
