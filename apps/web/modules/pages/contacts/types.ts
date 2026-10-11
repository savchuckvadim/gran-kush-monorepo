import type { LucideIcon } from "lucide-react";

export interface ContactsInfoItem {
    key: string;
    icon: LucideIcon;
    label: string;
    value: string;
    href?: string;
    multiline?: boolean;
}

export interface ContactsPageContent {
    title: string;
    subtitle: string;
    infoItems: ContactsInfoItem[];
}

export type ContactsTranslationKey =
    | "title"
    | "subtitle"
    | "clubsLabel"
    | "clubsValue"
    | "myClubsLabel"
    | "myClubsValue";
