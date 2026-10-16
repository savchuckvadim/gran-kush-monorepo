"use client";

import { Dialog } from "@workspace/ui";

import { SkinSheetContent } from "./skin-sheet-content";

/** The appearance sheet opened from elsewhere (the account menu, the header). */
export function SkinPickerSheet({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <SkinSheetContent />
        </Dialog>
    );
}
