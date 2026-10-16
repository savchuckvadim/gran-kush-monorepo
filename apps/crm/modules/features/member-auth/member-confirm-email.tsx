"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { Button } from "@workspace/ui";

import { confirmMemberEmail } from "@/modules/entities/cabinet-account";
import { useCabinetLinks } from "@/modules/processes/member-auth";
import { useMountAction } from "@/modules/shared/lib/use-mount-action";

/** Ссылка из письма подтверждения: токен в адресе, подтверждение запускается один раз при открытии. */
export function MemberConfirmEmail({ token }: { token: string }) {
    const t = useTranslations("cabinet.auth.confirm");
    const links = useCabinetLinks();
    const confirm = useMountAction(() => confirmMemberEmail(token));

    if (confirm.status === "error") {
        return (
            <div className="space-y-4 text-center" role="alert">
                <XCircle className="mx-auto size-10 text-destructive" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">{t("failed")}</p>
                <Button variant="outline" asChild className="w-full">
                    <Link href={links.login}>{t("toLogin")}</Link>
                </Button>
            </div>
        );
    }

    if (confirm.status === "success") {
        return (
            <div className="space-y-4 text-center" role="status">
                <CheckCircle2 className="mx-auto size-10 text-success" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">{t("done")}</p>
                <Button asChild className="w-full">
                    <Link href={links.login}>{t("toLogin")}</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            {t("working")}
        </div>
    );
}
