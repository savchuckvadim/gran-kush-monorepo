import { SkinBackdrop } from "@/modules/shared/ui/SkinBackdrop";

export const dynamic = "force-dynamic";

/** Account pages outside a club (a new club): no portal in the URL, the CRM session decides. */
export default function ClubsLayout({ children }: { children: React.ReactNode }) {
    return (
        <div
            data-slot="auth-page"
            className="flex min-h-screen min-w-full flex-col items-center justify-center"
        >
            <SkinBackdrop />
            {children}
        </div>
    );
}
