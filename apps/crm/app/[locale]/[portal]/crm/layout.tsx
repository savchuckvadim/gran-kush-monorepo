import { AuthProvider } from "@/modules/processes/auth";
import { CrmSectionGuard } from "@/modules/processes/navigation/crm";
import { CrmRealtime } from "@/modules/processes/realtime";
import { AppMessagesProvider } from "@/modules/shared/providers/app-messages-provider";
import { SidebarProvider } from "@/modules/shared/ui/Sidebar";
import { CrmShell } from "@/modules/widgets/crm-shell";
import { OperationToasts } from "@/modules/widgets/operations";

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
    return (
        <AppMessagesProvider>
            <AuthProvider>
                <CrmRealtime>
                    <OperationToasts />
                    <SidebarProvider>
                        <CrmShell>
                            <CrmSectionGuard>{children}</CrmSectionGuard>
                        </CrmShell>
                    </SidebarProvider>
                </CrmRealtime>
            </AuthProvider>
        </AppMessagesProvider>
    );
}
