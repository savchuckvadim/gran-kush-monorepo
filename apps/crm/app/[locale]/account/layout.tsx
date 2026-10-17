import { AppMessagesProvider } from "@/modules/shared/providers/app-messages-provider";
import { SkinBackdrop } from "@/modules/shared/ui/SkinBackdrop";

export const dynamic = "force-dynamic";

/**
 * Account pages outside a club (sign-in and security): no portal in the URL, the CRM session
 * decides. Behind a sign-in, so the full dictionary is sent (`AppMessagesProvider`).
 */
export default function AccountLayout({ children }: { children: React.ReactNode }) {
    return (
        <AppMessagesProvider>
            <div className="flex min-h-screen min-w-full flex-col items-center">
                <SkinBackdrop />
                {children}
            </div>
        </AppMessagesProvider>
    );
}
