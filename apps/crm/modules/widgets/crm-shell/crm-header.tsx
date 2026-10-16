"use client";

import { useTranslations } from "next-intl";

import { HeaderAppearance } from "@/modules/features";
import { useCrmNavigation } from "@/modules/processes";
import { AppHeader } from "@/modules/shared/ui/shell";
import { PortalSwitcher } from "@/modules/widgets/portal-switcher";

import { AccountMenu } from "./account-menu";
import { HeaderQuickActions } from "./header-quick-actions";
import { SearchTrigger } from "./search-trigger";

/** Шапка CRM: клуб и текущий раздел слева; поиск, действия у двери, оформление и аккаунт справа. */
export function CrmHeader() {
    const t = useTranslations("crm.shell");
    const section = useCrmNavigation().find((item) => item.isActive);

    return (
        <AppHeader
            labels={{ openMenu: t("openMenu"), closeMenu: t("closeMenu") }}
            start={
                <>
                    <PortalSwitcher />
                    {section && (
                        <div className="hidden min-w-0 items-center gap-2 text-sm md:flex">
                            <span aria-hidden="true" className="text-muted-foreground/50">
                                /
                            </span>
                            <span className="truncate font-medium">{section.title}</span>
                        </div>
                    )}
                </>
            }
            end={
                <>
                    <SearchTrigger />
                    <HeaderQuickActions />
                    <HeaderAppearance />
                    <AccountMenu />
                </>
            }
        />
    );
}
