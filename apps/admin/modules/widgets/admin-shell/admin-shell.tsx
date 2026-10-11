"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { Building2, ShieldCheck, Tags } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@workspace/ui/lib/utils";

import { LogoutButton } from "@/modules/features/auth";
import { LangSwitcher } from "@/modules/features/lang-switcher";
import { ROUTES, useLocalizedLink } from "@/modules/shared";

import { useSessionExpiredRedirect } from "./use-session-expired-redirect";

const NAV_ITEMS = [
    { code: "clubs", route: ROUTES.CLUBS, icon: Building2 },
    { code: "plans", route: ROUTES.PLANS, icon: Tags },
] as const;

export function AdminShell({ email, children }: { email: string | null; children: ReactNode }) {
    const t = useTranslations("navigation");
    const pathname = usePathname();
    const localizedLink = useLocalizedLink();

    useSessionExpiredRedirect(localizedLink(ROUTES.LOGIN));

    return (
        <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-30 border-b bg-card">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                    <Link
                        href={localizedLink(ROUTES.CLUBS)}
                        className="flex items-center gap-2 font-bold"
                    >
                        <ShieldCheck className="h-5 w-5 text-primary" />
                        {t("adminTitle")}
                    </Link>
                    <nav className="flex items-center gap-1">
                        {NAV_ITEMS.map(({ code, route, icon: Icon }) => {
                            const href = localizedLink(route);
                            const isActive = pathname === href || pathname.startsWith(`${href}/`);
                            return (
                                <Link
                                    key={code}
                                    href={href}
                                    aria-current={isActive ? "page" : undefined}
                                    className={cn(
                                        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                        isActive
                                            ? "bg-primary/20 text-primary"
                                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                    {t(code)}
                                </Link>
                            );
                        })}
                    </nav>
                    <div className="ml-auto flex items-center gap-2">
                        {email ? (
                            <span className="hidden text-sm text-muted-foreground md:inline">
                                {email}
                            </span>
                        ) : null}
                        <LangSwitcher />
                        <LogoutButton />
                    </div>
                </div>
            </header>
            <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
        </div>
    );
}
