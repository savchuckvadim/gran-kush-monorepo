import { MemberAuthProvider } from "@/modules/processes/member-auth";
import { CabinetRealtime } from "@/modules/processes/realtime";
import { AppMessagesProvider } from "@/modules/shared/providers/app-messages-provider";
import { SidebarProvider } from "@/modules/shared/ui/Sidebar";
import { MemberShell } from "@/modules/widgets/member-shell";

export const dynamic = "force-dynamic";

/** Всё, что требует сессии участника: дом, аккаунт, клубы. Без сессии охрана уводит на вход. */
export default function CabinetLayout({ children }: { children: React.ReactNode }) {
    return (
        <AppMessagesProvider>
            <MemberAuthProvider>
                <CabinetRealtime>
                    <SidebarProvider>
                        <MemberShell>{children}</MemberShell>
                    </SidebarProvider>
                </CabinetRealtime>
            </MemberAuthProvider>
        </AppMessagesProvider>
    );
}
