"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { Button } from "@workspace/ui";

import { confirmMemberEmail } from "@/modules/entities/lk-account";
import { useCabinetLinks } from "@/modules/processes/member-auth";

/** Ссылка из письма подтверждения: токен в адресе, подтверждение запускается один раз при открытии. */
export function MemberConfirmEmail({ token }: { token: string }) {
    const t = useTranslations("cabinet.auth.confirm");
    const links = useCabinetLinks();
    const confirm = useMutation({ mutationFn: confirmMemberEmail });
    const started = useRef(false);

    useEffect(() => {
        // Строгий режим React вызывает эффект дважды, а токен одноразовый
        if (started.current) return;
        started.current = true;
        confirm.mutate(token);
    }, [confirm, token]);

    if (confirm.isError) {
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

    if (confirm.isSuccess) {
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
