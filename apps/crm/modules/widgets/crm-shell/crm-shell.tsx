"use client";

import { useTranslations } from "next-intl";

import { CommandPaletteProvider, EmailConfirmBanner } from "@/modules/features";
import { CrmSidebar, useCrmNavigation } from "@/modules/processes";
import { BurgerButton } from "@/modules/shared/ui/Burger";
import { useSidebar } from "@/modules/shared/ui/Sidebar";
import { SkinBackdrop } from "@/modules/shared/ui/SkinBackdrop";
import { PortalSwitcher } from "@/modules/widgets/portal-switcher";
import { SubscriptionGate } from "@/modules/widgets/subscription-gate";

import { AccountMenu } from "./account-menu";
import { HeaderEcoToggle, HeaderSkinButton } from "./header-appearance";
import { HeaderQuickActions } from "./header-quick-actions";
import { HeaderThemeToggle } from "./header-theme-toggle";
import { SearchTrigger } from "./search-trigger";

interface CrmShellProps {
    children: React.ReactNode;
}

function CrmHeader() {
    const t = useTranslations("crm.shell");
    const { isOpen: isSidebarOpen, toggle: toggleSidebar } = useSidebar();
    const section = useCrmNavigation().find((item) => item.isActive);

    return (
        <header
            data-slot="app-header"
            className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-1 px-2 md:gap-2 md:px-4"
        >
            {/* burger.css sets display on the button itself, so the breakpoint lives on a wrapper */}
            <div className="flex md:hidden">
                <BurgerButton
                    isOpen={isSidebarOpen}
                    onToggle={toggleSidebar}
                    openLabel={t("openMenu")}
                    closeLabel={t("closeMenu")}
                />
            </div>

            <PortalSwitcher />
            {section && (
                <div className="hidden min-w-0 items-center gap-2 text-sm md:flex">
                    <span aria-hidden="true" className="text-muted-foreground/50">
                        /
                    </span>
                    <span className="truncate font-medium">{section.title}</span>
                </div>
            )}

            <div className="ml-auto flex items-center gap-0.5 md:gap-1.5">
                <SearchTrigger />
                <HeaderQuickActions />
                {/* on a phone the header keeps only the door actions; appearance lives in the account card */}
                <div className="hidden items-center sm:flex">
                    <HeaderThemeToggle />
                    <HeaderSkinButton />
                    <HeaderEcoToggle />
                </div>
                <AccountMenu />
            </div>
        </header>
    );
}

export function CrmShell({ children }: CrmShellProps) {
    return (
        <CommandPaletteProvider>
            <div data-slot="app-shell" className="flex min-h-screen min-w-full flex-row">
                <SkinBackdrop />
                <CrmSidebar />
                <div data-slot="app-column" className="flex w-full min-w-0 flex-1 flex-col">
                    <CrmHeader />
                    <main data-slot="app-main" className="relative flex min-w-0 flex-1 flex-col">
                        <div className="container mx-auto flex flex-1 flex-col p-3 pt-4 md:p-6">
                            <EmailConfirmBanner />
                            <SubscriptionGate>{children}</SubscriptionGate>
                        </div>
                    </main>
                </div>
            </div>
        </CommandPaletteProvider>
    );
}
