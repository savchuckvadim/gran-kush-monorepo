"use client";


import { useTranslations } from "next-intl";

import { Card } from "@workspace/ui";

import { useMyMemberInfo } from "@/modules/entities/member";
import { MemberDashboard } from "@/modules/widgets/member-dashboard";

export default function PersonalCabinetPage() {
    const t = useTranslations("profile");
 
    const { data: member, isLoading } = useMyMemberInfo();




    return (
        <div className="">
            <div className="mx-auto max-w-7xl">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold">{t("title")}</h1>
                    <p className="text-muted-foreground">{t("subtitle")}</p>
                </div>

                <div className="grid gap-6 lg:grid-cols-4">
                  

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
