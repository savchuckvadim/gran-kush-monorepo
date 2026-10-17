import { AuthProvider } from "@/modules/processes/auth";
import { CrmSectionGuard } from "@/modules/processes/navigation/crm";
import { AppMessagesProvider } from "@/modules/shared/providers/app-messages-provider";
import { SidebarProvider } from "@/modules/shared/ui/Sidebar";
import { CrmShell } from "@/modules/widgets/crm-shell";

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
    return (
        <AppMessagesProvider>
            <AuthProvider>
                <SidebarProvider>
                    <CrmShell>
                        <CrmSectionGuard>{children}</CrmSectionGuard>
                    </CrmShell>
                </SidebarProvider>
            </AuthProvider>
        </AppMessagesProvider>
    );
}
