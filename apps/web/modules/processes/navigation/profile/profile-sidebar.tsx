"use client";
import { useTranslations } from "next-intl";

import { Sidebar } from "@/modules/shared";

import { useProfileNavigation } from "./profile-navigation.hook";

export function ProfileSidebar() {
    const t = useTranslations("profile");
    const items = useProfileNavigation();
    return <Sidebar title={t("title")} items={items} />;
}
