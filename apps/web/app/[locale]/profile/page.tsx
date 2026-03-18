"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { History,LogOut, QrCode, Settings, User } from "lucide-react";

import { Button, Card } from "@workspace/ui";

import { useLogout } from "@/modules/entities/auth";
import { useMyMemberInfo } from "@/modules/entities/member";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";
import { MemberDashboard } from "@/modules/widgets/member-dashboard";

export default function PersonalCabinetPage() {
    const t = useTranslations("profile");
    const localizedLink = useLocalizedLink();
    const { data: member, isLoading } = useMyMemberInfo();
    const { logout } = useLogout();

    const handleLogout = () => {
        logout();
    };

    return (
        <div className="container py-12">
            <div className="mx-auto max-w-6xl">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold">{t("title")}</h1>
                    <p className="text-muted-foreground">{t("subtitle")}</p>
                </div>

                <div className="grid gap-6 lg:grid-cols-4">
                    {/* Sidebar Navigation */}
                    <div className="lg:col-span-1">
                        <nav className="space-y-2">
                            <Link
                                href={localizedLink(ROUTES.PROFILE)}
                                className="flex items-center gap-3 rounded-lg bg-muted px-4 py-3 text-sm font-medium transition-colors hover:bg-muted/80"
                            >
                                <User className="size-4" />
                                {t("nav.dashboard")}
                            </Link>
                            <Link
                                href={localizedLink(ROUTES.PROFILE_QR_CODE)}
                                className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors hover:bg-muted"
                            >
                                <QrCode className="size-4" />
                                {t("nav.qrCode")}
                            </Link>
                            <Link
                                href={localizedLink(ROUTES.PROFILE_PRESENCE)}
                                className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors hover:bg-muted"
                            >
                                <History className="size-4" />
                                {t("nav.presence")}
                            </Link>
                            <Link
                                href={localizedLink(ROUTES.PROFILE_SETTINGS)}
                                className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors hover:bg-muted"
                            >
                                <Settings className="size-4" />
                                {t("nav.settings")}
                            </Link>
                            <Button
                                variant="ghost"
                                className="w-full justify-start"
                                onClick={handleLogout}
                            >
                                <LogOut className="mr-3 size-4" />
                                {t("nav.logout")}
                            </Button>
                        </nav>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-3 space-y-6">
                        {isLoading ? (
                            <Card className="p-6">
                                <div className="text-center text-muted-foreground">{t("loading")}</div>
                            </Card>
                        ) : (
                            <>
                                {/* Member Info Card */}
                                {member && (
                                    <Card className="p-6">
                                        <h2 className="mb-4 text-xl font-semibold">{t("profileInformation")}</h2>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-sm font-medium text-muted-foreground">
                                                    {t("name")}
                                                </label>
                                                <p className="text-sm">{member.name}</p>
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-muted-foreground">
                                                    {t("email")}
                                                </label>
                                                <p className="text-sm">{member.email}</p>
                                            </div>
                                            {member.phone && (
                                                <div>
                                                    <label className="text-sm font-medium text-muted-foreground">
                                                        {t("phone")}
                                                    </label>
                                                    <p className="text-sm">{member.phone}</p>
                                                </div>
                                            )}
                                            <div>
                                                <label className="text-sm font-medium text-muted-foreground">
                                                    {t("memberStatus")}
                                                </label>
                                                <p className="text-sm">
                                                    {member.isActive ? t("activeMember") : t("inactiveMember")}
                                                </p>
                                            </div>
                                        </div>
                                    </Card>
                                )}

                                {/* Dashboard */}
                                <MemberDashboard />
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
