"use client";

import { useTranslations } from "next-intl";

export function AboutSection() {
    const t = useTranslations("home.about");

    return (
        <section id="about" className=" py-20 md:py-32">
            <div className="mx-auto max-w-3xl space-y-8 text-center">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                    {t("title")}
                </h2>
                <p className="text-lg text-muted-foreground">{t("description")}</p>
                <div className="grid gap-8 pt-8 md:grid-cols-3">
                    <div className="space-y-2">
                        <h3 className="text-xl font-semibold">{t("quality.title")}</h3>
                        <p className="text-muted-foreground">{t("quality.description")}</p>
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-semibold">{t("community.title")}</h3>
                        <p className="text-muted-foreground">{t("community.description")}</p>
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-semibold">{t("service.title")}</h3>
                        <p className="text-muted-foreground">{t("service.description")}</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
