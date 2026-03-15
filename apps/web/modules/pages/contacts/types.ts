import type { LucideIcon } from "lucide-react";

export interface ContactsInfoItem {
    key: string;
    icon: LucideIcon;
    label: string;
    value: string;
    href?: string;
    multiline?: boolean;
}

export interface ContactsFormContent {
    title: string;
    nameLabel: string;
    emailLabel: string;
    emailPlaceholder: string;
    messageLabel: string;
    submitLabel: string;
}

export interface ContactsPageContent {
    title: string;
    subtitle: string;
    infoItems: ContactsInfoItem[];
    form: ContactsFormContent;
}

export type ContactsTranslationKey =
    | "title"
    | "subtitle"
    | "email"
    | "phone"
    | "address"
    | "sendMessage"
    | "name"
    | "message"
    | "send"
    | "emailValue"
    | "phoneValue"
    | "addressValue"
    | "emailPlaceholder";
