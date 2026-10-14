"use client";
import { FC } from "react";
import { useTranslations } from "next-intl";

import { Pencil } from "lucide-react";

import { Button } from "@workspace/ui";

import { useIsMobile } from "../../lib";

export interface IEditMemberDocumentButtonProps {
    handleClick: () => void;
    /** Своя подпись (например, «Лицевая сторона»); показывается и на мобильном. */
    label?: string;
}

export const EditMemberDocumentButton: FC<IEditMemberDocumentButtonProps> = ({
    handleClick,
    label,
}) => {
    const t = useTranslations("crm.members");
    const isMobile = useIsMobile();
    const text = label ?? t("editDocument");
    const hideText = label == null && isMobile;
    return (
        <div>
            <Button size="sm" variant="outline" onClick={handleClick}>
                <>
                    <Pencil className="mr-2 h-4 w-4" />
                    {!hideText && <p>{text}</p>}
                </>
            </Button>
        </div>
    );
};
