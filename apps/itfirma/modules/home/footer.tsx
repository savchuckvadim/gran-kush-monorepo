import { useTranslations } from "next-intl";

import { INSIGHTS_PATH } from "@/modules/shared/config/articles";
import { LEGAL_DOCS, MENU_SECTIONS } from "@/modules/shared/config/routes";
import { SERVICE_KEYS, servicePath } from "@/modules/shared/config/services";
import { CONTACT_EMAIL, OWNER, SITE_NAME } from "@/modules/shared/config/site";
import { Link } from "@/modules/shared/i18n/navigation";
import { CtaLink } from "@/modules/shared/ui/cta-link";
import { Logo } from "@/modules/shared/ui/logo";

const LINK = "text-muted-foreground transition-colors hover:text-foreground";

/** Every page of the site in four columns, the request button, and who stands behind the studio. */
export const Footer = () => {
    const t = useTranslations("footer");
    const nav = useTranslations("nav");
    const cta = useTranslations("cta");
    const services = useTranslations("services.items");
    const legal = useTranslations("legal.titles");

    return (
        <footer className="border-t border-border">
            <div className="wrap grid gap-10 py-16 text-sm md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
                <div className="space-y-5">
                    <Logo />
                    <p className="max-w-xs text-muted-foreground">{t("tagline")}</p>
                    <CtaLink>{cta("request")}</CtaLink>
                </div>
                <div>
                    <p className="mb-3 font-medium">{t("services")}</p>
                    <ul className="space-y-2">
                        {SERVICE_KEYS.map((key) => (
                            <li key={key}>
                                <Link href={servicePath(key)} className={LINK}>
                                    {services(`${key}.title`)}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
                <div>
                    <p className="mb-3 font-medium">{t("company")}</p>
                    <ul className="space-y-2">
                        {MENU_SECTIONS.map((section) => (
                            <li key={section}>
                                <Link href={`/#${section}`} className={LINK}>
                                    {nav(section)}
                                </Link>
                            </li>
                        ))}
                        <li>
                            <Link href={INSIGHTS_PATH} className={LINK}>
                                {nav("insights")}
                            </Link>
                        </li>
                        <li>
                            <Link href="/#faq" className={LINK}>
                                {nav("faq")}
                            </Link>
                        </li>
                    </ul>
                </div>
                <div>
                    <p className="mb-3 font-medium">{t("contact")}</p>
                    <a
                        href={`mailto:${CONTACT_EMAIL}`}
                        className="block text-foreground underline-offset-4 hover:underline"
                    >
                        {CONTACT_EMAIL}
                    </a>
                    <ul className="mt-5 space-y-2">
                        {LEGAL_DOCS.map((doc) => (
                            <li key={doc}>
                                <Link href={`/legal/${doc}`} className={LINK}>
                                    {legal(doc)}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
            <div className="wrap flex flex-col gap-2 border-t border-border py-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
                <span>
                    © {new Date().getFullYear()} {SITE_NAME}
                </span>
                <span>{t("owner", { name: OWNER.name, nif: OWNER.nif })}</span>
            </div>
        </footer>
    );
};
