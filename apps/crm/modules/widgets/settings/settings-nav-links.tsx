"use client";

import NextLink from "next/link";
import { useTranslations } from "next-intl";

import { Link2, Palette, Settings2, UserPlus } from "lucide-react";

import { Card } from "@workspace/ui";

import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

const LINKS = [
    { href: ROUTES.CRM_SETTINGS_ENTITIES, key: "entities", icon: Settings2 },
    { href: ROUTES.CRM_SETTINGS_INVITATIONS, key: "invitations", icon: UserPlus },
    { href: ROUTES.CRM_SETTINGS_REGISTRATION_LINKS, key: "registrationLinks", icon: Link2 },
    { href: ROUTES.CRM_SETTINGS_APPEARANCE, key: "appearance", icon: Palette },
] as const;

export function SettingsNavLinks() {
    const t = useTranslations("crm.sections.settings.links");
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
                                    <p className="font-medium">{t(`${link.key}.title`)}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {t(`${link.key}.description`)}
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
