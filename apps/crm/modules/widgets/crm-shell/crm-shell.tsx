"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { Cat, Menu, Rabbit, X } from "lucide-react";

import { Button, ThemeToggle } from "@workspace/ui";
import { cn } from "@workspace/ui/lib/utils";

import { LangSwitcher } from "@/modules/features";
import { CrmSidebar, useAuth } from "@/modules/processes";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";
import { useSidebar } from "@/modules/shared/ui/Sidebar";

interface CrmShellProps {
    children: React.ReactNode;
}

export function CrmShell({ children }: CrmShellProps) {
    const t = useTranslations("crm.shell");
    const localizedLink = useLocalizedLink();
    const pathname = usePathname();
    const { isOpen: isSidebarOpen, toggle: toggleSidebar } = useSidebar();
    const isCrm = pathname.includes(ROUTES.CRM_HOME);
    const { currentUser } = useAuth()
    return (
        <div className="flex min-h-screen min-w-full flex-row">
            <CrmSidebar />
            <div className="flex flex-1 flex-col">
                <header
                    className={cn(
                        "sticky top-0 flex w-full justify-center  bg-background/80 backdrop-blur-sm",
                        isCrm ? "" : "z-50",
                    )}
                >
                    <div className="container flex h-16 items-center justify-between px-4 md:px-0">
                        <div className="flex items-center gap-6">
                            {isCrm && (
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
                            {/* <div className="flex items-center gap-2">
                                <span className="rounded bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                                    {t("title")}
                                </span>
                                <span className="text-sm text-muted-foreground">{t("workspace")}</span>
                            </div> */}
                        </div>

                        <div className={cn("items-center gap-4 md:flex", isCrm ? "flex" : "hidden")}>
                            <LangSwitcher />
                            <ThemeToggle />
                            <Button variant="outline" size="sm" asChild
                                className="text-primary border-primary hover:bg-primary hover:text-background"
                                style={{ cursor: 'pointer' }}>
                                <Link href={localizedLink(ROUTES.CRM_PROFILE)}>
                                    <div className="flex items-center gap-2">
                                        <Rabbit className="size-4" />
                                        <span>
                                            {
                                                currentUser
                                                    ? currentUser.name
                                                    : t("profile")

                                            }
                                        </span>
                                    </div>
                                </Link>
                            </Button>
                        </div>
                    </div>
                </header>

                <main className="container flex flex-1 flex-col p-3">{children}</main>
            </div>
        </div>
    );
}
