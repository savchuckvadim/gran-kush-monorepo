import { SkinBackdrop } from "@/modules/shared/ui/SkinBackdrop";

export const dynamic = "force-dynamic";

/** Вход, регистрация и письма участника: без оболочки и без охраны сессии. */
export default function MemberAuthLayout({ children }: { children: React.ReactNode }) {
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
