import { SkinBackdrop } from "@/modules/shared/ui/SkinBackdrop";

export const dynamic = "force-dynamic";

/** Public page reached from the "a club added you" email: no portal in the URL, no session. */
export default function ConsentLayout({ children }: { children: React.ReactNode }) {
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
