"use client";

import { useTranslations } from "next-intl";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui";

import type { MemberCardData } from "../model/member-card.types";

import { MemberDocumentsTab } from "./MemberDocumentsTab";
import { MemberOrdersTab } from "./MemberOrdersTab";
import { MemberOverviewTab } from "./MemberOverviewTab";
import { MemberTabCount } from "./MemberTabCount";
import { MemberVisitsTab } from "./MemberVisitsTab";

export function MemberCardTabs({ data }: { data: MemberCardData }) {
    const t = useTranslations("crm.members.card.tabs");
    const documentsCount = data.member.documents.length + (data.member.hasSignature ? 1 : 0);

    return (
        <Tabs defaultValue="overview">
            <TabsList>
                <TabsTrigger value="overview">{t("overview")}</TabsTrigger>
                <TabsTrigger value="orders">
                    {t("orders")}
                    <MemberTabCount value={data.ordersTotal} />
                </TabsTrigger>
                <TabsTrigger value="visits">
                    {t("visits")}
                    <MemberTabCount value={data.visitsTotal} />
                </TabsTrigger>
                <TabsTrigger value="documents">
                    {t("documents")}
                    <MemberTabCount value={documentsCount} />
                </TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
                <MemberOverviewTab data={data} />
            </TabsContent>
            <TabsContent value="orders">
                <MemberOrdersTab orders={data.orders} />
            </TabsContent>
            <TabsContent value="visits">
                <MemberVisitsTab visits={data.visits} />
            </TabsContent>
            <TabsContent value="documents">
                <MemberDocumentsTab member={data.member} />
            </TabsContent>
        </Tabs>
    );
}
