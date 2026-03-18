import { getTranslations } from "next-intl/server";

import { MemberDocumentPreviewClient } from "./MemberDocumentPreviewClient";

export default async function CrmMemberDocumentPreviewPage({
    params,
}: {
    params: Promise<{ locale: string; memberId: string; documentId: string }>;
}) {
    const { locale, memberId, documentId } = await params;
    const t = await getTranslations("crm.members");

    return (
        <MemberDocumentPreviewClient
            locale={locale}
            memberId={memberId}
            documentId={documentId}
            previewTitle={t("singleDocumentPreviewTitle")}
            backToDocumentsLabel={t("backToDocuments")}
            downloadLabel={t("downloadDocument")}
        />
    );
}
