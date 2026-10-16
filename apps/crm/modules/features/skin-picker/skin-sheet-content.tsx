"use client";

import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@workspace/ui";

import { ClubSkinNotice } from "./club-skin-notice";
import { SkinGallery } from "./skin-gallery";
import { SkinOptions } from "./skin-options";
import { useSkinText } from "./use-skin-text";

// The dialog primitive restyled as a right-hand sheet; packages/ui has no sheet yet.
const SHEET_CLASS =
    "top-0 right-0 left-auto h-dvh max-h-dvh w-full max-w-md translate-x-0 translate-y-0 content-start gap-4 overflow-y-auto rounded-none border-y-0 border-r-0 p-5 sm:max-w-md data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right";

/** The appearance sheet: light/dark, energy saving, the club's skin and the gallery. */
export function SkinSheetContent() {
    const text = useSkinText();
    return (
        <DialogContent className={SHEET_CLASS}>
            <DialogHeader className="pr-8">
                <DialogTitle>{text.t("sheetTitle")}</DialogTitle>
                <DialogDescription>{text.t("sheetDescription")}</DialogDescription>
            </DialogHeader>
            <SkinOptions />
            <ClubSkinNotice />
            <SkinGallery />
        </DialogContent>
    );
}
