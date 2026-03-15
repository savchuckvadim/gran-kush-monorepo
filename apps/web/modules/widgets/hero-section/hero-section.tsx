"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { ArrowRight } from "lucide-react";

import { Button } from "@workspace/ui";

import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

export function HeroSection() {
    const t = useTranslations("home.hero");
    const tCommon = useTranslations("common");
    const localizedLink = useLocalizedLink();

    return (
        <section className="relative  bg-primary/10 flex min-h-[100vh] flex-col items-center justify-center  w-full pt-16">
            {/* Background with border pattern like separator - diagonal grid */}

            {/* <div className="absolute inset-0 bg-none mix-blend-difference  min-h-full min-w-screen bg-background  "> */}
            {/* <Iridescence color={[0.5, 1, 0.5]} speed={1.0} amplitude={0.1} mouseReact={true} /> */}
            {/* </div> */}
            {/* <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-muted"> */}

            {/* </div> */}

            <div className="container relative z-10 flex flex-col items-center gap-8 text-center px-4 py-20 md:py-32">
                <h1 className="text-4xl font-bold tracking-tight sm:text-6xl md:text-7xl">
                    {t("title")}{" "}
                    <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        {tCommon("companyName")}
                    </span>
                </h1>
                <p className="max-w-2xl text-lg text-muted-foreground sm:text-xl">
                    {t("subtitle")}
                </p>
                <div className="flex flex-col gap-4 sm:flex-row">
                    <Button size="lg" asChild>
                        <Link href={localizedLink(ROUTES.REGISTER)}>
                            {t("getStarted")}
                            <ArrowRight className="ml-2 size-4" />
                        </Link>
                    </Button>
                    <Button size="lg" variant="outline" asChild>
                        <Link href={localizedLink(ROUTES.PROFILE)}>{t("personalCabinet")}</Link>
                    </Button>
                </div>
            </div>
        </section>
    );
}
