import { getTranslations } from "next-intl/server";

import { MemberDocumentPreviewPage } from "@/modules/pages";

export default async function CrmMemberDocumentPreviewPage({
    params,
}: {
    params: Promise<{ locale: string; portal: string; id: string; documentId: string }>;
}) {
    const { id: memberId, documentId } = await params;
    const t = await getTranslations("crm.members");

    return (
        <MemberDocumentPreviewPage
            memberId={memberId}
            documentType={documentId}
            previewTitle={t("singleDocumentPreviewTitle")}
            // backToProfile={t("backToProfile")}
            // downloadLabel={t("downloadDocument")}
        />
    );
}
