"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { ArrowRight } from "lucide-react";

import { Button } from "@workspace/ui";

import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

export function CTASection() {
    const t = useTranslations("home.cta");
    const localizedLink = useLocalizedLink();

    return (
        <section className="border-t  bg-muted/50 py-20 md:py-32">
            <div className="">
                <div className="mx-auto max-w-3xl space-y-8 text-center">
                    <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("title")}</h2>
                    <p className="text-lg text-muted-foreground">{t("description")}</p>
                    <Button size="lg" asChild>
                        <Link href={localizedLink(ROUTES.REGISTER)}>
                            {t("button")}
                            <ArrowRight className="ml-2 size-4" />
                        </Link>
                    </Button>
                </div>
            </div>
        </section>
    );
}
