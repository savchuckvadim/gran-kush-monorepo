import { CrmShell } from "@/modules/widgets/crm-shell/crm-shell";

export default async function CrmLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;

    return <CrmShell locale={locale}>{children}</CrmShell>;
}
