import { getTranslations } from "next-intl/server";

import { MemberDocumentPreviewPage } from "@/modules/pages";

export default async function CrmMemberDocumentPreviewPage({
    params,
}: {
    params: Promise<{ locale: string; memberId: string; documentId: string }>;
}) {
    const { locale, memberId, documentId } = await params;
    const t = await getTranslations("crm.members");

    return (
        <MemberDocumentPreviewPage
            locale={locale}
            memberId={memberId}
            documentType={documentId}
            previewTitle={t("singleDocumentPreviewTitle")}
            // backToProfile={t("backToProfile")}
            // downloadLabel={t("downloadDocument")}
        />
    );
}
