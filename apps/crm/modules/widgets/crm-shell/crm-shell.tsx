import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button, ThemeToggle } from "@workspace/ui";

import { LangSwitcher } from "@/modules/features";

interface CrmShellProps {
    locale: string;
    children: React.ReactNode;
}

export function CrmShell({ locale, children }: CrmShellProps) {
    const t = useTranslations("crm.shell");
    const crmNavItems = [
        { label: t("nav.clients"), href: "/crm/members" },
        { label: t("nav.products"), href: "/crm/products" },
        { label: t("nav.orders"), href: "/crm/orders" },
        { label: t("nav.attendance"), href: "/crm/attendance" },
        { label: t("nav.finance"), href: "/crm/finance" },
        { label: t("nav.employees"), href: "/crm/employees" },
    ];

    return (
        <div className="flex min-h-screen w-full bg-muted/20">
            <aside className="hidden w-64 shrink-0 border-r bg-background lg:flex lg:flex-col">
                <div className="border-b px-5 py-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {t("brand")}
                    </p>
                    <h2 className="text-lg font-semibold">{t("title")}</h2>
                </div>
                <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
                    {crmNavItems.map((item) => (
                        <Link
                            key={item.href}
                            href={`/${locale}${item.href}`}
                            className="rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted"
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>
            </aside>

            <div className="flex min-h-screen w-full flex-col">
                <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background px-4">
                    <div className="flex items-center gap-2">
                        <span className="rounded bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                            {t("title")}
                        </span>
                        <span className="text-sm text-muted-foreground">{t("workspace")}</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <LangSwitcher />
                        <ThemeToggle />
                        <Button variant="outline" size="sm" asChild>
                            <Link href={`/${locale}/crm/profile`}>{t("profile")}</Link>
                        </Button>
                    </div>
                </header>

                <main className="flex-1 p-4 md:p-6">{children}</main>
            </div>
        </div>
    );
}
