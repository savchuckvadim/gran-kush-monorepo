"use client";

import { ChangeEvent, useRef, useState } from "react";
import { usePathname,useRouter } from "next/navigation";
import { useLocale,useTranslations } from "next-intl";

import { Pencil, Upload } from "lucide-react";

import { Button, FieldInput, SignatureCanvasField } from "@workspace/ui";
import { Field, FieldContent, FieldLabel } from "@workspace/ui/components/field";

import { ThemedSignatureImage } from "@/modules/entities/member";
import { type UpdateCrmMemberFilesPayload,useUpdateCrmMemberFiles } from "@/modules/entities/member-documents";
import { isApiErrorWithStatus } from "@/modules/shared";

interface MemberDocumentEditModalProps {
    memberId: string;
    isSignature: boolean;
    side?: "first" | "second";
    initialDocumentType?: string;
    currentPreviewUrl: string;
}

export function MemberDocumentEditModal({
    memberId,
    isSignature,
    side,
    initialDocumentType = "passport",
    currentPreviewUrl,
}: MemberDocumentEditModalProps) {
    const t = useTranslations("crm.members");
    const tEditor = useTranslations("crm.members.editor");
    const router = useRouter();
    const pathname = usePathname();
    const locale = useLocale();
    const updateFilesMutation = useUpdateCrmMemberFiles();
    const [isOpen, setIsOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [documentType, setDocumentType] = useState(initialDocumentType);
    const [mode, setMode] = useState<"upload" | "draw">("upload");
    const [file, setFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fileToDataUrl = (input: File): Promise<string> =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error("file read failed"));
            reader.readAsDataURL(input);
        });

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
                const signature =
                    mode === "draw"
                        ? signatureDataUrl
                        : file
                          ? await fileToDataUrl(file)
                          : null;

                if (!signature) {
                    setError(tEditor("uploadError"));
                    return;
                }

                payload = { signature };
            } else {
                if (!file || !side) {
                    setError(tEditor("uploadError"));
                    return;
                }

                payload =
                    side === "first"
                        ? {
                              documentType,
                              documentFirst: await fileToDataUrl(file),
                          }
                        : {
                              documentType,
                              documentSecond: await fileToDataUrl(file),
                          };
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
            <Button
                size="sm"
                variant="outline"
                onClick={() => {
                    setError(null);
                    setIsOpen(true);
                }}
            >
                <Pencil className="mr-2 h-4 w-4" />
                {t("editDocument")}
            </Button>

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
                                <Field>
                                    <FieldLabel>{t("newFile")}</FieldLabel>
                                    <FieldContent>
                                        <div className="mb-2 rounded-md border bg-muted/30 p-2">
                                            <img
                                                src={filePreview ?? currentPreviewUrl}
                                                alt="document-preview"
                                                className="h-44 w-full object-contain"
                                            />
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
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <Upload className="mr-2 h-4 w-4" />
                                            {t("chooseFile")}
                                        </Button>
                                    </FieldContent>
                                </Field>
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
                                    <Field>
                                        <FieldLabel>{t("newFile")}</FieldLabel>
                                        <FieldContent>
                                            <div className="mb-2 rounded-md border bg-muted/30 p-2">
                                                <ThemedSignatureImage
                                                    src={filePreview ?? currentPreviewUrl}
                                                    alt="signature-preview"
                                                    className="h-28 w-full object-contain"
                                                />
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
                                                onClick={() => fileInputRef.current?.click()}
                                            >
                                                <Upload className="mr-2 h-4 w-4" />
                                                {t("chooseFile")}
                                            </Button>
                                        </FieldContent>
                                    </Field>
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
                            <Button
                                onClick={handleSave}
                                disabled={updateFilesMutation.isPending}
                            >
                                {updateFilesMutation.isPending ? tEditor("saving") : t("saveDocument")}
                            </Button>
                        </div>
                        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
                    </div>
                </div>
            ) : null}
        </>
    );
}
