import { AuthProvider } from "@/modules/processes/auth";
import { CrmShell } from "@/modules/widgets/crm-shell";

export default async function CrmLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;

    return (
        <AuthProvider>
            <CrmShell locale={locale}>{children}</CrmShell>
        </AuthProvider>
    );
}
