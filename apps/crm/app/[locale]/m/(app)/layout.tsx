import { MemberAuthProvider } from "@/modules/processes/member-auth";
import { SidebarProvider } from "@/modules/shared/ui/Sidebar";
import { MemberShell } from "@/modules/widgets/member-shell";

export const dynamic = "force-dynamic";

/** Всё, что требует сессии участника: дом, аккаунт, клубы. Без сессии охрана уводит на вход. */
export default function CabinetLayout({ children }: { children: React.ReactNode }) {
    return (
        <MemberAuthProvider>
            <SidebarProvider>
                <MemberShell>{children}</MemberShell>
            </SidebarProvider>
        </MemberAuthProvider>
    );
}
