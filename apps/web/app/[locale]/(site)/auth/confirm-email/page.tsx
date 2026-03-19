"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { Mail } from "lucide-react";

import { Button, Card, FieldInput } from "@workspace/ui";

import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

export default function ConfirmEmailPage() {
    const t = useTranslations("auth.confirmEmail");
    const localizedLink = useLocalizedLink();
    const searchParams = useSearchParams();
    const [email, setEmail] = useState(searchParams.get("email") ?? "");
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // TODO: Implement API call to resend confirmation
            console.log("Resend confirmation to:", email);
            await new Promise((resolve) => setTimeout(resolve, 1000));
            setSent(true);
        } catch {
            // Handle error
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
