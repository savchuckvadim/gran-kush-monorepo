import { useTranslations } from "next-intl";

import { Link } from "@/modules/shared/i18n/navigation";

export default function NotFound() {
    const t = useTranslations("notFound");

    return (
        <section className="mx-auto max-w-6xl px-4 py-32 md:px-6">
            <p className="font-mono text-xs text-primary">404</p>
            <h1 className="mt-3 text-4xl md:text-6xl">{t("title")}</h1>
            <p className="mt-4 text-muted-foreground">{t("text")}</p>
            <Link
                href="/"
                className="mt-8 inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground"
            >
                {t("home")}
            </Link>
        </section>
    );
}
