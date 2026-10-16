"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { getApiErrorMessage } from "@workspace/api-client/core";
import { Button, ModalDialog, SignatureCanvasField } from "@workspace/ui";

import { usePutSignature } from "@/modules/entities/cabinet-passport";

interface DrawSignatureDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Подпись сохранена: карточке нужно перечитать превью */
    onSaved: () => void;
}

/**
 * Подпись пальцем или мышью вместо загрузки файла. Сохраняется так же, как загруженная: PNG
 * аккаунта, который потом показывается клубам по переключателю.
 */
export function DrawSignatureDialog({ open, onOpenChange, onSaved }: DrawSignatureDialogProps) {
    const t = useTranslations("cabinet.passport.signature");
    const put = usePutSignature();
    const [drawn, setDrawn] = useState<string | null>(null);

    const close = (next: boolean) => {
        if (!next) setDrawn(null);
        onOpenChange(next);
    };

    return (
        <ModalDialog
            open={open}
            onOpenChange={close}
            size="md"
            title={t("drawTitle")}
            description={t("drawHint")}
            footer={
                <>
                    <Button variant="outline" onClick={() => close(false)}>
                        {t("cancel")}
                    </Button>
                    <Button
                        disabled={!drawn || put.isPending}
                        onClick={() =>
                            drawn &&
                            put.mutate(drawn, {
                                onSuccess: () => {
                                    onSaved();
                                    close(false);
                                },
                            })
                        }
                    >
                        {put.isPending ? t("saving") : t("useDrawn")}
                    </Button>
                </>
            }
        >
            <SignatureCanvasField
                value={drawn ?? undefined}
                onChange={setDrawn}
                placeholder={t("drawPlaceholder")}
                labels={{ clear: t("clear"), save: t("done") }}
            />
            {put.error && (
                <p role="alert" className="text-sm text-destructive">
                    {getApiErrorMessage(put.error)}
                </p>
            )}
        </ModalDialog>
    );
}
