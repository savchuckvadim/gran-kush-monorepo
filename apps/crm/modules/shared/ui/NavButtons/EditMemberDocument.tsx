'use client'
import { FC } from "react"
import {  useTranslations } from "next-intl"

import { Button } from "@workspace/ui"

import { useIsMobile } from "../../lib"
import { Pencil } from "lucide-react"

export interface IEditMemberDocumentButtonProps {
    handleClick: () => void;
}

export const EditMemberDocumentButton: FC<IEditMemberDocumentButtonProps>  =   ({
    handleClick
}) => {
 
    const t = useTranslations("crm.members");
    const label = t("editDocument")
    const isMobile = useIsMobile()
    return (
        <div>
            <Button
                size="sm"
                variant="outline"
                onClick={handleClick}
            >

                <>
                    <Pencil className="mr-2 h-4 w-4" />
                    {!isMobile && <p>
                        {label}
                    </p>}
                </>
            </Button>
        </div>
    );
}