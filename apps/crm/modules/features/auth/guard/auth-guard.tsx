"use client";

import { useEffect, useState } from "react";
import { usePathname,useRouter } from "next/navigation";

import { Loader2 } from "lucide-react";

import { $api } from "@/modules/shared";
import { hasAccessToken } from "@/modules/shared/lib/auth";

interface AuthGuardProps {
    children: React.ReactNode;
    locale: string;
}

/**
 * Клиентский AuthGuard для защиты CRM маршрутов.
 *
 * Проверяет наличие access token в localStorage.
 * Если токена нет — редирект на /auth/login.
 * Если токен есть — проверяет /crm/auth/me.
 * Если /crm/auth/me вернул ошибку — редирект на /auth/login.
 */
export function AuthGuard({ children, locale }: AuthGuardProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

    useEffect(() => {
        async function checkAuth() {
            // Быстрая проверка — есть ли токен вообще
            if (!hasAccessToken()) {
                router.replace(`/${locale}/auth/login?redirect=${encodeURIComponent(pathname)}`);
                return;
            }

            try {
                // Проверяем токен через API — вызов /crm/auth/me
                const response = await $api.GET("/crm/auth/me");

                if (response.response.ok && response.data) {
                    setIsAuthenticated(true);
                } else {
                    // Токен невалиден / истёк и не обновился
                    router.replace(`/${locale}/auth/login?redirect=${encodeURIComponent(pathname)}`);
                }
            } catch {
                // Ошибка сети или сервер недоступен
                router.replace(`/${locale}/auth/login?redirect=${encodeURIComponent(pathname)}`);
            }
        }

        checkAuth();
    }, [locale, pathname, router]);

    if (isAuthenticated === null) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return <>{children}</>;
}
