"use client";

import { ModalDialog } from "@workspace/ui";

import { ClubSkinNotice } from "./club-skin-notice";
import { SkinGallery } from "./skin-gallery";
import { SkinOptions } from "./skin-options";
import { useSkinText } from "./use-skin-text";

/**
 * Шторка оформления справа (из шапки и меню аккаунта): светлый/тёмный режим, энергосбережение,
 * тема клуба и галерея тем.
 */
export function SkinPickerSheet({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const text = useSkinText();
    return (
        <ModalDialog
            open={open}
            onOpenChange={onOpenChange}
            variant="sheet"
            title={text.t("sheetTitle")}
            description={text.t("sheetDescription")}
        >
            <SkinOptions />
            <ClubSkinNotice />
            <SkinGallery />
        </ModalDialog>
    );
}
