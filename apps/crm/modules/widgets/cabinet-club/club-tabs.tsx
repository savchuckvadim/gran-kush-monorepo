"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { QrCode, ReceiptText, ShoppingBag } from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";

import { useCabinetLinks } from "@/modules/processes/member-auth";

/** Разделы клуба. «Заказы» активны и на странице одного заказа. */
export function ClubTabs({ slug }: { slug: string }) {
    const t = useTranslations("cabinet.club.tabs");
    const links = useCabinetLinks();
    const pathname = usePathname();

    const tabs = [
        { href: links.club(slug), label: t("club"), icon: QrCode, exact: true },
        { href: links.clubShop(slug), label: t("shop"), icon: ShoppingBag, exact: false },
        { href: links.clubOrders(slug), label: t("orders"), icon: ReceiptText, exact: false },
    ];

    return (
        <nav
            aria-label={t("label")}
            className="flex gap-1 overflow-x-auto overflow-y-hidden border-b"
        >
            {tabs.map(({ href, label, icon: Icon, exact }) => {
                const active = exact ? pathname === href : pathname.startsWith(href);
                return (
                    <Link
                        key={href}
                        href={href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                            "flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                            active
                                ? "border-primary text-foreground"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Icon className="size-4" aria-hidden="true" />
                        {label}
                    </Link>
                );
            })}
        </nav>
    );
}
