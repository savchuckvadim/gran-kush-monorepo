"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { getApiErrorMessage } from "@workspace/api-client/core";
import {
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    FieldInput,
    FieldSelect,
} from "@workspace/ui";

import { type DocumentSide, useUploadDocument } from "@/modules/entities/cabinet-passport";

import { DOCUMENT_ACCEPT, fileToDataUrl, MAX_DOCUMENT_BYTES } from "./file-to-data-url";

const TYPES = ["passport", "id_card", "residence_permit", "driving_license", "other"] as const;
const SIDES: DocumentSide[] = ["single", "front", "back"];

/**
 * Загрузка документа в аккаунт. Клубам файл ничего не открывает: показ включается отдельно, в
 * карточке документа. Если прежнюю версию этого документа уже видит клуб, он продолжит видеть её.
 */
export function UploadDocumentDialog({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const t = useTranslations("cabinet.passport");
    const upload = useUploadDocument();
    const [type, setType] = useState<string>("passport");
    const [side, setSide] = useState<DocumentSide>("single");
    const [number, setNumber] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [localError, setLocalError] = useState<string | null>(null);

    const reset = () => {
        setType("passport");
        setSide("single");
        setNumber("");
        setFile(null);
        setLocalError(null);
        upload.reset();
    };

    const submit = async () => {
        if (!file) {
            setLocalError(t("upload.noFile"));
            return;
        }
        if (file.size > MAX_DOCUMENT_BYTES) {
            setLocalError(t("upload.tooBig"));
            return;
        }
        setLocalError(null);
        const data = await fileToDataUrl(file);
        upload.mutate(
            { type, side, number: number.trim() || undefined, file: data },
            {
                onSuccess: () => {
                    reset();
                    onOpenChange(false);
                },
            }
        );
    };

    const error = localError ?? (upload.error ? getApiErrorMessage(upload.error) : null);

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!next) reset();
                onOpenChange(next);
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t("upload.title")}</DialogTitle>
                    <DialogDescription>{t("upload.hint")}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <FieldSelect
                        label={t("upload.type")}
                        value={type}
                        onValueChange={setType}
                        options={TYPES.map((value) => ({
                            value,
                            label: t(`types.${value}`),
                        }))}
                    />
                    <FieldSelect
                        label={t("upload.side")}
                        value={side}
                        onValueChange={(value) => setSide(value as DocumentSide)}
                        options={SIDES.map((value) => ({ value, label: t(`sides.${value}`) }))}
                    />
                    <FieldInput
                        label={t("upload.number")}
                        value={number}
                        maxLength={100}
                        onChange={(event) => setNumber(event.target.value)}
                    />
                    <div className="space-y-1.5">
                        <label htmlFor="document-file" className="text-sm font-medium">
                            {t("upload.file")}
                        </label>
                        <input
                            id="document-file"
                            type="file"
                            accept={DOCUMENT_ACCEPT}
                            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                            className="block w-full text-sm file:mr-3 file:rounded-md file:border file:bg-muted file:px-3 file:py-1.5 file:text-sm"
                        />
                        <p className="text-xs text-muted-foreground">{t("upload.fileHint")}</p>
                    </div>
                    {error && (
                        <p role="alert" className="text-sm text-destructive">
                            {error}
                        </p>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {t("cancel")}
                    </Button>
                    <Button disabled={upload.isPending} onClick={() => void submit()}>
                        {upload.isPending ? t("upload.submitting") : t("upload.submit")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
