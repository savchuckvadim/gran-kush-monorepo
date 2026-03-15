"use client";

import { useTranslations } from "next-intl";

import { Mail, MapPin, Phone } from "lucide-react";

import { ContactsFormCard } from "./components/contacts-form-card";
import { ContactsHero } from "./components/contacts-hero";
import { ContactsInfoList } from "./components/contacts-info-list";
import { ContactsInfoItem, ContactsPageContent, ContactsTranslationKey } from "./types";

function buildContactsContent(t: (key: ContactsTranslationKey) => string): ContactsPageContent {
    const infoItems: ContactsInfoItem[] = [
        {
            key: "email",
            icon: Mail,
            label: t("email"),
            value: t("emailValue"),
            href: `mailto:${t("emailValue")}`,
        },
        {
            key: "phone",
            icon: Phone,
            label: t("phone"),
            value: t("phoneValue"),
            href: `tel:${t("phoneValue")}`,
        },
        {
            key: "address",
            icon: MapPin,
            label: t("address"),
            value: t("addressValue"),
            multiline: true,
        },
    ];

    return {
        title: t("title"),
        subtitle: t("subtitle"),
        infoItems,
        form: {
            title: t("sendMessage"),
            nameLabel: t("name"),
            emailLabel: t("email"),
            emailPlaceholder: t("emailPlaceholder"),
            messageLabel: t("message"),
            submitLabel: t("send"),
        },
    };
}

export function ContactsPage() {
    const t = useTranslations("contacts");
    const content = buildContactsContent((key) => t(key));

    return (
        <div className="container min-w-full py-20">
            <div className="mx-auto max-w-3xl space-y-12">
                <ContactsHero title={content.title} subtitle={content.subtitle} />
                <div className="grid gap-8 md:grid-cols-2">
                    <ContactsInfoList items={content.infoItems} />
                    <ContactsFormCard form={content.form} />
                </div>
            </div>
        </div>
    );
}
