"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { Mail } from "lucide-react";

import { Button, Card, FieldInput } from "@workspace/ui";

import { resendConfirmationEmail } from "@/modules/entities/auth/api/auth.api";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

const SUPPORTED_MAIL_LOCALES = ["ru", "es", "en"] as const;
type MailLocale = (typeof SUPPORTED_MAIL_LOCALES)[number];

export default function ConfirmEmailPage() {
    const t = useTranslations("auth.confirmEmail");
    const locale = useLocale();
    const localizedLink = useLocalizedLink();
    const searchParams = useSearchParams();
    const [email, setEmail] = useState(searchParams.get("email") ?? "");
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const mailLocale = SUPPORTED_MAIL_LOCALES.includes(locale as MailLocale)
                ? (locale as MailLocale)
                : undefined;
            await resendConfirmationEmail({ email, locale: mailLocale });
            setSent(true);
        } catch {
            // Ответ сервера одинаков для любого адреса; сетевую ошибку показываем той же карточкой
            setSent(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container flex min-h-[calc(100vh-8rem)] items-center justify-center py-12">
            <Card
                className="w-full max-w-md"
                title={t("title")}
                description={sent ? t("success") : t("subtitle")}
                headerIcon={
                    <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
                        <Mail className="size-6 text-primary" />
                    </div>
                }
                headerClassName="text-center"
            >
                {!sent ? (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <FieldInput
                            label={t("email")}
                            type="email"
                            required
                            {...{ value: email, onChange: (e) => setEmail(e.target.value) }}
                            placeholder="your.email@example.com"
                        />

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? t("submitting") : t("resend")}
                        </Button>
                    </form>
                ) : (
                    <div className="space-y-4">
                        <Button asChild className="w-full">
                            <Link href={localizedLink(ROUTES.LOGIN)}>{t("goToLogin")}</Link>
                        </Button>
                        <Button variant="outline" className="w-full" onClick={() => setSent(false)}>
                            {t("resend")}
                        </Button>
                    </div>
                )}

                <div className="text-center text-sm text-muted-foreground mt-4">
                    <Link
                        href={localizedLink(ROUTES.LOGIN)}
                        className="text-primary hover:underline"
                    >
                        {t("goToLogin")}
                    </Link>
                </div>
            </Card>
        </div>
    );
}
