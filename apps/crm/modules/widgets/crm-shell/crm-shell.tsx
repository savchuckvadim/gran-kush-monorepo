"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { EmailConfirmBanner } from "@/modules/features";
import { CrmSidebar } from "@/modules/processes";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";
import { BrandMark } from "@/modules/shared/ui/Brand";
import { BurgerButton } from "@/modules/shared/ui/Burger";
import { useSidebar } from "@/modules/shared/ui/Sidebar";
import { SkinBackdrop } from "@/modules/shared/ui/SkinBackdrop";
import { SubscriptionGate } from "@/modules/widgets/subscription-gate";

import { HeaderActions } from "./header-actions";

interface CrmShellProps {
    children: React.ReactNode;
}

export function CrmShell({ children }: CrmShellProps) {
    const t = useTranslations("crm.shell");
    const localizedLink = useLocalizedLink();
    const { isOpen: isSidebarOpen, toggle: toggleSidebar, close: closeSidebar } = useSidebar();

    return (
        <div className="flex min-h-screen min-w-full flex-row">
            <SkinBackdrop />
            <CrmSidebar mobilePanel={<HeaderActions variant="drawer" onNavigate={closeSidebar} />} />
            <div className="flex w-full min-w-0 flex-1 flex-col justify-center">
                <header
                    data-slot="app-header"
                    className="sticky top-0 z-30 flex w-full justify-center bg-background/80 backdrop-blur-sm"
                >
                    <div className="container flex h-16 items-center justify-between gap-2 px-4 md:px-0">
                        <div className="flex min-w-0 items-center gap-2 md:hidden">
                            <BurgerButton
                                isOpen={isSidebarOpen}
                                onToggle={toggleSidebar}
                                openLabel={t("openMenu")}
                                closeLabel={t("closeMenu")}
                            />
                            <Link
                                href={localizedLink(ROUTES.CRM_HOME)}
                                onClick={closeSidebar}
                                className="flex items-center gap-2 text-lg font-bold"
                            >
                                <BrandMark />
                                <span>{t("brand")}</span>
                            </Link>
                        </div>

                        <div className="ml-auto hidden md:flex">
                            <HeaderActions variant="bar" />
                        </div>
                    </div>
                </header>

                <main className="min-w-full  mx-auto flex flex-1 flex-col p-3 pt-4 bg-card-background rounded-tl-xl">
                    <div className="container mx-auto flex flex-1 flex-col p-3 pt-0">
                        <EmailConfirmBanner />
                        <SubscriptionGate>{children}</SubscriptionGate>
                    </div>
                </main>
            </div>
        </div>
    );
}
