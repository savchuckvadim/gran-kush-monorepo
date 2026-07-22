"use client";

import NextLink from "next/link";

import { Boxes, Link2, Settings2, UserPlus } from "lucide-react";

import { Card } from "@workspace/ui";

import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

const LINKS = [
    {
        href: ROUTES.CRM_SETTINGS_ENTITIES,
        title: "Поля, формы и стадии",
        description: "Конструктор сущностей: клиенты, заказы, смарт-процессы.",
        icon: Settings2,
    },
    {
        href: `${ROUTES.CRM_ENTITIES}/member`,
        title: "Записи смарт-процессов",
        description: "Универсальные списки и канбан по стадиям.",
        icon: Boxes,
    },
    {
        href: ROUTES.CRM_SETTINGS_INVITATIONS,
        title: "Приглашения сотрудников",
        description: "Ссылки-инвайты для команды портала.",
        icon: UserPlus,
    },
    {
        href: ROUTES.CRM_SETTINGS_REGISTRATION_LINKS,
        title: "Ссылки-формы регистрации",
        description: "Публичные ссылки и QR-коды для клиентов.",
        icon: Link2,
    },
];

export function SettingsNavLinks() {
    const toAppPath = useLocalizedLink();

    return (
        <div className="grid gap-3 md:grid-cols-2">
            {LINKS.map((link) => {
                const Icon = link.icon;
                return (
                    <NextLink key={link.href} href={toAppPath(link.href)}>
                        <Card className="h-full p-4 transition-colors hover:bg-muted/40">
                            <div className="flex items-start gap-3">
                                <Icon className="mt-0.5 h-5 w-5 text-primary" />
                                <div>
                                    <p className="font-medium">{link.title}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {link.description}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </NextLink>
                );
            })}
        </div>
    );
}
