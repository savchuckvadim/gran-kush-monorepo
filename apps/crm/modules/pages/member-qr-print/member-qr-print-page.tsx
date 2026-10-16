"use client";

import { useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Loader2, Printer } from "lucide-react";

import { Button, ScannableQrCode } from "@workspace/ui";

import { useMemberDetails } from "@/modules/entities/member";
import { usePortalInfo } from "@/modules/entities/portal";
import { useMemberQrCode } from "@/modules/entities/qr-code";
import { personName } from "@/modules/shared/lib/person-name";

const formatDate = (iso: string, locale: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(iso));

/**
 * Лист с кодом участника для печати: клуб, имя и номер, код, срок. Всегда белый лист с тёмным
 * текстом, независимо от темы CRM. Диалог печати открывается сам, как только всё загрузилось;
 * кнопка — чтобы напечатать ещё раз.
 */
export function MemberQrPrintPage({ memberId }: { memberId: string }) {
    const t = useTranslations("crm.qrPrint");
    const locale = useLocale();
    const club = usePortalInfo();
    const member = useMemberDetails(memberId);
    const qr = useMemberQrCode(memberId);
    const printed = useRef(false);

    const ready = Boolean(club.data && member.data && qr.data && !qr.data.isExpired);

    useEffect(() => {
        if (!ready || printed.current) return;
        printed.current = true;
        window.print();
    }, [ready]);

    const loading = club.isLoading || member.isLoading || qr.isLoading;

    return (
        <main className="min-h-screen bg-white px-4 py-10 text-black print:p-0">
            {loading && (
                <div className="flex justify-center py-20">
                    <Loader2 className="size-6 animate-spin text-neutral-500" aria-hidden="true" />
                </div>
            )}

            {!loading && !ready && (
                <p className="mx-auto max-w-md text-center text-sm text-neutral-600">
                    {t("noCode")}
                </p>
            )}

            {ready && club.data && member.data && qr.data && (
                <article className="mx-auto flex max-w-md flex-col items-center gap-5 text-center">
                    <p className="text-sm tracking-wide text-neutral-500 uppercase">
                        {club.data.displayName}
                    </p>
                    <div className="space-y-1">
                        <h1 className="text-2xl font-semibold">
                            {personName(member.data, member.data.email)}
                        </h1>
                        {member.data.membershipNumber && (
                            <p className="font-mono text-sm text-neutral-600">
                                {t("number", { number: member.data.membershipNumber })}
                            </p>
                        )}
                    </div>
                    <ScannableQrCode
                        value={qr.data.encryptedCode}
                        size={280}
                        className="rounded-none border border-neutral-200 p-4"
                    />
                    <p className="text-sm">
                        {t("validUntil", { date: formatDate(qr.data.expiresAt, locale) })}
                    </p>
                    <p className="text-xs text-neutral-600">{t("hint")}</p>
                    <Button
                        variant="outline"
                        className="print:hidden"
                        onClick={() => window.print()}
                    >
                        <Printer aria-hidden="true" />
                        {t("print")}
                    </Button>
                </article>
            )}
        </main>
    );
}
