import { AuthGuard } from "@/modules/features/auth";
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
        <AuthGuard locale={locale}>
            <CrmShell locale={locale}>{children}</CrmShell>
        </AuthGuard>
    );
}
