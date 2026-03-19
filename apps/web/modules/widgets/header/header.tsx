"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { Menu, X } from "lucide-react";

import { Button } from "@workspace/ui";
import { cn } from "@workspace/ui/lib/utils";

import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";
import { useSidebar } from "@/modules/shared/ui/Sidebar/sidebar-context";

import { Navigation } from "../navigation/navigation";

import { AuthButtons } from "./components/auth-buttons";
import { HeaderActions } from "./components/header-actions";
import { Logo } from "./components/logo";
import { MobileMenu } from "./components/mobile-menu";

export function Header() {
    const t = useTranslations("navigation");
    const tCommon = useTranslations("common");
    const localizedLink = useLocalizedLink();
    const pathname = usePathname();
    const isProfile = pathname.includes(ROUTES.PROFILE);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const { isOpen: isSidebarOpen, toggle: toggleSidebar } = useSidebar();

    const navigationItems = [
        { key: "home" as const, href: localizedLink(ROUTES.HOME), label: t("home") },
        { key: "about" as const, href: localizedLink(ROUTES.ABOUT), label: t("about") },
        { key: "contacts" as const, href: localizedLink(ROUTES.CONTACTS), label: t("contacts") },
    ];

    return (
        <header className="sticky top-0 z-50 w-full flex justify-center bg-background/80 backdrop-blur-sm">
            <div className="container flex h-16 items-center justify-between md:px-0 px-4">
                <div className="flex items-center gap-6">
                    {/* Бургер для сайдбара — только на мобильных в профиле */}
                    {isProfile && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden"
                            onClick={toggleSidebar}
                            aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
                            aria-expanded={isSidebarOpen}
                        >
                            {isSidebarOpen ? <X className="size-6" /> : <Menu className="size-6" />}
                        </Button>
                    )}
                    {!isProfile && <Logo companyName={tCommon("companyName")} />}
                    {!isProfile && <Navigation items={navigationItems} />}
                </div>
                <div className={
                    cn("md:flex items-center gap-4 ", isProfile ? "flex" : "hidden")
                }>
                    <HeaderActions />
                    <AuthButtons loginLabel={t("login")} registerLabel={t("register")} />
                </div>

                {!isProfile && <MobileMenu
                    isOpen={isMobileMenuOpen}
                    onToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    navigationItems={navigationItems}
                    loginLabel={t("login")}
                    registerLabel={t("register")}
                    currentPath={pathname}
                />
                }
            </div>
        </header>
    );
}
