"use client";
import { FC } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { ArrowLeftIcon } from "lucide-react";

import { Button } from "@workspace/ui";

import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

import { useIsMobile } from "../../lib";

export interface IBackToMememberProfileProps {
    memberId: string;
}
export const BackToMememberProfile: FC<IBackToMememberProfileProps> = ({ memberId }) => {
    const router = useRouter();
    const toAppPath = useLocalizedLink();
    const path = toAppPath(`${ROUTES.CRM_MEMBER_DETAILS}/${memberId}`);
    const t = useTranslations("crm.members");
    const backToProfile = t("backToProfile");
    const isMobile = useIsMobile();
    return (
        <Button variant="outline" onClick={() => router.push(path)}>
            <>
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                {!isMobile && <p>{backToProfile}</p>}
            </>
        </Button>
    );
};
