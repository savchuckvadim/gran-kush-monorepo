import { SkinBackdrop } from "@/modules/shared/ui/SkinBackdrop";

// Force dynamic rendering to avoid cache conflicts
export const dynamic = "force-dynamic";

export default async function LocaleLayout({ children }: { children: React.ReactNode }) {
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
