// import { getTranslations } from "next-intl/server";

import { MemberPage } from "@/modules/pages";

export default async function Page({
    params,
}: {
    params: Promise<{ locale: string; id: string }>;
}) {
    const { locale, id } = await params;
    // const t = await getTranslations("crm.members");
    // const signatureTitle = t("signatureTitle")
    // const documentsTitle = t("documents")
    // const openDocumentsRoute = t("openDocumentsRoute")

    return (
        <MemberPage
            memberId={id}
            locale={locale}
            // signatureTitle={signatureTitle}
            // documentsTitle={documentsTitle}
            // openDocumentsRoute={openDocumentsRoute}
        />
    );
}
