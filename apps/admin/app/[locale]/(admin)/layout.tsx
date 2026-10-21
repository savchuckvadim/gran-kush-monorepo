import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ROUTES } from "@/modules/shared/config/routes";
import {
    PLATFORM_EMAIL_COOKIE,
    PLATFORM_REFRESH_COOKIE,
} from "@/modules/shared/server/platform-session";
import { AdminShell } from "@/modules/widgets/admin-shell";

export default async function AdminLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const cookieStore = await cookies();

    // Вход — живой refresh: cookie живёт до его exp; истёкший access обновит прокси, отозванную
    // сессию API отклонит 401, и прокси сотрёт cookie
    if (!cookieStore.get(PLATFORM_REFRESH_COOKIE)?.value) {
        redirect(`/${locale}${ROUTES.LOGIN}`);
    }

    return (
        <AdminShell email={cookieStore.get(PLATFORM_EMAIL_COOKIE)?.value ?? null}>
            {children}
        </AdminShell>
    );
}
