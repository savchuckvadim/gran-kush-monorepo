import { AuthProvider } from "@/modules/processes/auth";
import { AppMessagesProvider } from "@/modules/shared/providers/app-messages-provider";
import { SidebarProvider } from "@/modules/shared/ui/Sidebar";
import { CrmShell } from "@/modules/widgets/crm-shell";

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
    return (
        <AppMessagesProvider>
            <AuthProvider>
                <SidebarProvider>
                    <CrmShell>{children}</CrmShell>
                </SidebarProvider>
            </AuthProvider>
        </AppMessagesProvider>
    );
}
