"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { Building2, Home } from "lucide-react";

import { useCabinetLinks } from "@/modules/processes/member-auth";
import { BurgerButton } from "@/modules/shared/ui/Burger";
import { ShellBrand } from "@/modules/shared/ui/Brand";
import { Sidebar, type ISidebarItem, useSidebar } from "@/modules/shared/ui/Sidebar";
import { SkinBackdrop } from "@/modules/shared/ui/SkinBackdrop";
import { HeaderEcoToggle, HeaderSkinButton } from "@/modules/widgets/crm-shell/header-appearance";
import { HeaderThemeToggle } from "@/modules/widgets/crm-shell/header-theme-toggle";

import { ClubSwitcher } from "./club-switcher";
import { MemberAccountMenu } from "./member-account-menu";

/**
 * Оболочка кабинета участника. Собрана из тех же деталей, что оболочка CRM (сайдбар, бургер,
 * подложка темы, переключатели оформления), поэтому у кабинета те же 17 тем и тот же вид.
 * Своё здесь только меню, переключатель клубов и меню аккаунта участника.
 */
export function MemberShell({ children }: { children: React.ReactNode }) {
    return (
        <div data-slot="app-shell" className="flex min-h-screen min-w-full flex-row">
            <SkinBackdrop />
            <MemberSidebar />
            <div data-slot="app-column" className="flex w-full min-w-0 flex-1 flex-col">
                <MemberHeader />
                <main data-slot="app-main" className="relative flex min-w-0 flex-1 flex-col">
                    <div className="container mx-auto flex flex-1 flex-col p-3 pt-4 md:p-6">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}

function MemberSidebar() {
    const t = useTranslations("cabinet.shell");
    const links = useCabinetLinks();
    const pathname = usePathname();

    const items: ISidebarItem[] = [
        {
            id: 1,
            code: "home",
            url: links.home,
            title: t("home"),
            isActive: pathname === links.home,
            icon: <Home />,
        },
        {
            id: 2,
            code: "clubs",
            url: links.clubs,
            title: t("clubs"),
            isActive: pathname === links.clubs,
            icon: <Building2 />,
        },
    ];

    return (
        <Sidebar
            brand={<ShellBrand name={t("brand")} />}
            items={items}
            homeHref={links.home}
            labels={{ collapse: t("collapseMenu"), pin: t("pinMenu") }}
        />
    );
}

function MemberHeader() {
    const t = useTranslations("cabinet.shell");
    const { isOpen, toggle } = useSidebar();

    return (
        <header
            data-slot="app-header"
            className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-1 px-2 md:gap-2 md:px-4"
        >
            <div className="flex md:hidden">
                <BurgerButton
                    isOpen={isOpen}
                    onToggle={toggle}
                    openLabel={t("openMenu")}
                    closeLabel={t("closeMenu")}
                />
            </div>

            <ClubSwitcher />

            <div className="ml-auto flex items-center gap-0.5 md:gap-1.5">
                <div className="hidden items-center sm:flex">
                    <HeaderThemeToggle />
                    <HeaderSkinButton />
                    <HeaderEcoToggle />
                </div>
                <MemberAccountMenu />
            </div>
        </header>
    );
}
