import { SkinBackdrop } from "@/modules/shared/ui/SkinBackdrop";

export const dynamic = "force-dynamic";

/** Public pages reached from a registration link or its QR: no portal in the URL, no session. */
export default function JoinLayout({ children }: { children: React.ReactNode }) {
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
