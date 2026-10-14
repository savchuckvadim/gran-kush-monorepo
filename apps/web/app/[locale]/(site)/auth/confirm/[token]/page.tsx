"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { Loader2, Mail } from "lucide-react";

import { Button, Card } from "@workspace/ui";

import { useEmailConfirm } from "@/modules/entities/auth";
import { ROUTES, useLocalizedLink } from "@/modules/shared";

/** Ссылка из письма подтверждает адрес; пароль — тот, что задан при регистрации. */
export default function ConfirmEmailPage() {
    const t = useTranslations("auth.confirmEmail");
    const params = useParams();
    const token = params.token as string;
    const localizedLink = useLocalizedLink();
    const { data, isPending, isIdle, error, mutate } = useEmailConfirm(token);

    useEffect(() => {
        mutate();
    }, [mutate]);

    const description = error
        ? error.message || t("error")
        : data?.success
          ? t("success")
          : t("subtitle");

    return (
        <div className="container flex min-h-[calc(100vh-8rem)] items-center justify-center py-12">
            <Card
                className="w-full max-w-md"
                title={t("title")}
                description={description}
                headerIcon={
                    <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
                        <Mail className="size-6 text-primary" />
                    </div>
                }
                headerClassName="text-center"
            >
                {isPending || isIdle ? (
                    <div className="flex justify-center py-2">
                        <Loader2 className="size-6 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <Button asChild className="w-full">
                        <Link href={localizedLink(ROUTES.LOGIN)}>{t("goToLogin")}</Link>
                    </Button>
                )}
            </Card>
        </div>
    );
}
