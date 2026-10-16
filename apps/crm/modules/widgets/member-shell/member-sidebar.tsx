"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { Building2, Home, ShieldCheck, UserRound } from "lucide-react";

import { useCabinetLinks } from "@/modules/processes/member-auth";
import { ShellBrand } from "@/modules/shared/ui/Brand";
import { type ISidebarItem, Sidebar } from "@/modules/shared/ui/Sidebar";

/** Меню кабинета: дом, мои клубы, паспорт, аккаунт. Разделы одного клуба — вкладки на его странице. */
export function MemberSidebar() {
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
        {
            id: 3,
            code: "passport",
            url: links.passport,
            title: t("passport"),
            isActive: pathname === links.passport,
            icon: <ShieldCheck />,
        },
        {
            id: 4,
            code: "account",
            url: links.account,
            title: t("account"),
            isActive: pathname === links.account,
            icon: <UserRound />,
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
