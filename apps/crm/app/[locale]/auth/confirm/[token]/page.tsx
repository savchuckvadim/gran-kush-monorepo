"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { Mail } from "lucide-react";

import { Card } from "@workspace/ui";

import { ConfirmEmailByToken } from "@/modules/features";

export default function ConfirmEmailPage() {
    const t = useTranslations("auth.confirmEmail");
    const { token } = useParams<{ token: string }>();

    return (
        <div className="container flex min-h-[calc(100vh-8rem)] items-center justify-center py-12">
            <Card
                className="w-full max-w-md"
                title={t("title")}
                headerIcon={
                    <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
                        <Mail className="size-6 text-primary" />
                    </div>
                }
                headerClassName="text-center"
            >
                <ConfirmEmailByToken token={token} />
            </Card>
        </div>
    );
}
