"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { LogOut, Settings, User } from "lucide-react";

import { Button } from "@workspace/ui";

import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

export default function PersonalCabinetPage() {
    const t = useTranslations("profile");
    const localizedLink = useLocalizedLink();

    return (
        <div className="container py-12">
            <div className="mx-auto max-w-4xl">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold">{t("title")}</h1>
                    <p className="text-muted-foreground">{t("subtitle")}</p>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    <div className="md:col-span-1">
                        <nav className="space-y-2">
                            <Link
                                href={localizedLink(ROUTES.PROFILE)}
                                className="flex items-center gap-3 rounded-lg bg-muted px-4 py-3 text-sm font-medium transition-colors hover:bg-muted/80"
                            >
                                <User className="size-4" />
                                {t("profile")}
                            </Link>
                            <Link
                                href={localizedLink(ROUTES.PROFILE_SETTINGS)}
                                className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors hover:bg-muted"
                            >
                                <Settings className="size-4" />
                                {t("settings")}
                            </Link>
                            <Button
                                variant="ghost"
                                className="w-full justify-start"
                                onClick={() => {
                                    // TODO: Implement logout
                                    console.log("Logout");
                                }}
                            >
                                <LogOut className="mr-3 size-4" />
                                {t("logout")}
                            </Button>
                        </nav>
                    </div>

                    <div className="md:col-span-2 space-y-6">
                        <div className="rounded-lg border bg-card p-6">
                            <h2 className="mb-4 text-xl font-semibold">
                                {t("profileInformation")}
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">
                                        {t("name")}
                                    </label>
                                    <p className="text-sm">John Doe</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">
                                        {t("email")}
                                    </label>
                                    <p className="text-sm">john.doe@example.com</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">
                                        {t("memberStatus")}
                                    </label>
                                    <p className="text-sm">{t("activeMember")}</p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-lg border bg-card p-6">
                            <h2 className="mb-4 text-xl font-semibold">{t("quickActions")}</h2>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Button variant="outline" asChild>
                                    <Link href={localizedLink(ROUTES.REGISTER)}>
                                        {t("completeRegistration")}
                                    </Link>
                                </Button>
                                <Button variant="outline" asChild>
                                    <Link href={localizedLink(ROUTES.CONTACTS)}>
                                        {t("contactSupport")}
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
