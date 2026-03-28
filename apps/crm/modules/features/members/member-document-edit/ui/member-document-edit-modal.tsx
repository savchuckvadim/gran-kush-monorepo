"use client";

import { ChangeEvent, useRef, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Pencil, Upload } from "lucide-react";

import { Button, FieldInput, SignatureCanvasField } from "@workspace/ui";
import { Field, FieldContent, FieldLabel } from "@workspace/ui/components/field";

import { ThemedSignatureImage } from "@/modules/entities/member";
import {
    type UpdateCrmMemberFilesPayload,
    useIdentityDocumentPreview,
    useSignaturePreview,
    useUpdateCrmMemberFiles,
} from "@/modules/entities/member-documents";
import { EditMemberDocumentButton, isApiErrorWithStatus } from "@/modules/shared";

import { dataUrlToBlob, fileToDataUrl } from "../lib/utils";

import { FileUpload } from "./components/FileUpload";
import { SignatureUpload } from "./components/SignatureUpload";

interface MemberDocumentEditModalProps {
    memberId: string;
    documentId: string;
    isSignature: boolean;
    payloadKey?: "documentFirst" | "documentSecond";
    initialDocumentType?: string;
    currentPreviewUrl: string;
}

export function MemberDocumentEditModal({
    documentId,
    memberId,
    isSignature,
    payloadKey,
    initialDocumentType = "passport",
    currentPreviewUrl,
}: MemberDocumentEditModalProps) {
    console.log("MemberDocumentEditModal documentId", documentId);
    const t = useTranslations("crm.members");
    const tEditor = useTranslations("crm.members.editor");
    const router = useRouter();
    const pathname = usePathname();
    const updateFilesMutation = useUpdateCrmMemberFiles();
    const [isOpen, setIsOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [documentType, setDocumentType] = useState(initialDocumentType);
    const [mode, setMode] = useState<"upload" | "draw">("upload");
    const [file, setFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const identityDocumentIdFromPreviewUrl = (() => {
        // currentPreviewUrl example:
        //   /crm/members/{memberId}/identity-documents/{documentId}/preview
        // allow full URL + optional query/hash
        const match = currentPreviewUrl.match(
            /identity-documents\/([^/?#]+)\/preview(?:[?#].*)?$/u
        );
        return match?.[1] ?? "";
    })();

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0] ?? null;
        setFile(selectedFile);
        if (!selectedFile) {
            setFilePreview(null);
            return;
        }
        setFilePreview(await fileToDataUrl(selectedFile));
    };

    const handleSave = async () => {
        setError(null);

        try {
            let payload: UpdateCrmMemberFilesPayload;

            if (isSignature) {
                const signatureBlob =
                    mode === "draw"
                        ? signatureDataUrl
                            ? await dataUrlToBlob(signatureDataUrl)
                            : null
                        : (file ?? null);

                if (!signatureBlob) {
                    setError(tEditor("uploadError"));
                    return;
                }

                payload = { signature: signatureBlob };
            } else {
                if (!file || !payloadKey) {
                    setError(tEditor("uploadError"));
                    return;
                }
                payload = {
                    documentType,
                    [payloadKey]: file,
                } as UpdateCrmMemberFilesPayload;
            }

            await updateFilesMutation.mutateAsync({
                memberId,
                payload,
            });

            setIsOpen(false);
            setFile(null);
            setFilePreview(null);
            setSignatureDataUrl(null);
            // Force refresh server components by pushing to the same path
            // This ensures the documents list is updated immediately
            router.push(pathname);
            router.refresh();
        } catch (error: unknown) {
            if (isApiErrorWithStatus(error, 413)) {
                setError(t("fileTooLarge"));
            } else {
                setError(tEditor("uploadError"));
            }
        }
    };

    return (
        <>
            <EditMemberDocumentButton
                handleClick={() => {
                    setError(null);
                    setIsOpen(true);
                }}
            />

            {isOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-xl rounded-lg border bg-background p-4">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-base font-medium">
                                {isSignature ? t("editSignature") : t("editDocument")}
                            </h3>
                            <Button variant="outline" onClick={() => setIsOpen(false)}>
                                {tEditor("cancelEdit")}
                            </Button>
                        </div>

                        {!isSignature ? (
                            <div className="space-y-3">
                                <FieldInput
                                    label={tEditor("fields.documentType")}
                                    value={documentType}
                                    onChange={(e) => setDocumentType(e.target.value)}
                                />
                                <FileUpload
                                    memberId={memberId}
                                    documentId={identityDocumentIdFromPreviewUrl}
                                    currentPreviewUrl={currentPreviewUrl}
                                    filePreview={filePreview}
                                    fileInputRef={fileInputRef}
                                    file={file}
                                    setFile={setFile}
                                    handleFileChange={handleFileChange}
                                />
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        size="sm"
                                        variant={mode === "upload" ? "default" : "outline"}
                                        onClick={() => setMode("upload")}
                                    >
                                        {t("uploadImage")}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant={mode === "draw" ? "default" : "outline"}
                                        onClick={() => setMode("draw")}
                                    >
                                        {t("drawSignature")}
                                    </Button>
                                </div>

                                {mode === "upload" ? (
                                    <SignatureUpload
                                        memberId={memberId}
                                        currentPreviewUrl={currentPreviewUrl}
                                        filePreview={filePreview}
                                        fileInputRef={fileInputRef}
                                        file={file}
                                        setFile={setFile}
                                        handleFileChange={handleFileChange}
                                    />
                                ) : (
                                    <SignatureCanvasField
                                        value={signatureDataUrl ?? undefined}
                                        onChange={setSignatureDataUrl}
                                        placeholder={t("signaturePlaceholder")}
                                    />
                                )}
                            </div>
                        )}

                        <div className="mt-4">
                            <Button onClick={handleSave} disabled={updateFilesMutation.isPending}>
                                {updateFilesMutation.isPending
                                    ? tEditor("saving")
                                    : t("saveDocument")}
                            </Button>
                        </div>
                        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
                    </div>
                </div>
            ) : null}
        </>
    );
}
