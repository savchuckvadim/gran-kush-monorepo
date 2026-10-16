"use client";

import { useTranslations } from "next-intl";

import { Card } from "@workspace/ui";

/** Карточка страницы входа участника: заголовок и подзаголовок берутся из `cabinet.auth.<раздел>`. */
export function MemberAuthCard({
    section,
    children,
}: {
    section: "login" | "register" | "forgot" | "reset" | "confirm";
    children: React.ReactNode;
}) {
    const t = useTranslations(`cabinet.auth.${section}`);

    return (
        <div className="container flex min-h-[calc(100vh-8rem)] items-center justify-center py-12">
            <Card
                className="w-full max-w-md"
                title={t("title")}
                description={t("subtitle")}
                headerClassName="text-center"
            >
                {children}
            </Card>
        </div>
    );
}
