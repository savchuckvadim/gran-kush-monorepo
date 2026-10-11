"use client";

import { useTranslations } from "next-intl";

import { MapPin, Users } from "lucide-react";

import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

import { ContactsHero } from "./components/contacts-hero";
import { ContactsInfoList } from "./components/contacts-info-list";
import { ContactsInfoItem, ContactsPageContent, ContactsTranslationKey } from "./types";

function buildContactsContent(
    t: (key: ContactsTranslationKey) => string,
    localizedLink: (path: string) => string
): ContactsPageContent {
    const infoItems: ContactsInfoItem[] = [
        {
            key: "clubs",
            icon: MapPin,
            label: t("clubsLabel"),
            value: t("clubsValue"),
            href: localizedLink(ROUTES.CLUBS),
        },
        {
            key: "myClubs",
            icon: Users,
            label: t("myClubsLabel"),
            value: t("myClubsValue"),
            href: localizedLink(ROUTES.PROFILE_CLUBS),
        },
    ];

    return {
        title: t("title"),
        subtitle: t("subtitle"),
        infoItems,
    };
}

export function ContactsPage() {
    const t = useTranslations("contacts");
    const localizedLink = useLocalizedLink();
    const content = buildContactsContent((key) => t(key), localizedLink);

    return (
        <div className="container min-w-full py-20">
            <div className="mx-auto max-w-3xl space-y-12">
                <ContactsHero title={content.title} subtitle={content.subtitle} />
                <ContactsInfoList items={content.infoItems} />
            </div>
        </div>
    );
}
