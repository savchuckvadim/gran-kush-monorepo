import { useTranslations } from "next-intl";

import { LEGAL_DOCS } from "@/modules/shared/config/routes";
import { CONTACT_EMAIL, OWNER, SITE_NAME } from "@/modules/shared/config/site";
import { Link } from "@/modules/shared/i18n/navigation";
import { Logo } from "@/modules/shared/ui/logo";
import { SkinSwitch } from "@/modules/shared/ui/skin-switch";

/** Wordmark, legal links and who stands behind the studio, as Spanish law asks on every page. */
export const Footer = () => {
    const t = useTranslations("footer");
    const legal = useTranslations("legal.titles");

    return (
        <footer className="border-t border-border">
            <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 text-sm md:grid-cols-3 md:px-6">
                <div className="space-y-3">
                    <Logo />
                    <p className="max-w-xs text-muted-foreground">{t("tagline")}</p>
                    <div className="flex items-center gap-3 pt-2">
                        <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                            {t("theme")}
                        </span>
                        <SkinSwitch />
                    </div>
                </div>
                <div className="space-y-2">
                    <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                        {t("legal")}
                    </p>
                    <ul className="space-y-1.5">
                        {LEGAL_DOCS.map((doc) => (
                            <li key={doc}>
                                <Link
                                    href={`/legal/${doc}`}
                                    className="text-muted-foreground transition-colors hover:text-foreground"
                                >
                                    {legal(doc)}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="space-y-2">
                    <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                        {t("contact")}
                    </p>
                    <a
                        href={`mailto:${CONTACT_EMAIL}`}
                        className="block text-foreground underline-offset-4 hover:underline"
                    >
                        {CONTACT_EMAIL}
                    </a>
                    <p className="text-muted-foreground">
                        {t("owner", { name: OWNER.name, nif: OWNER.nif })}
                    </p>
                </div>
            </div>
            <div className="mx-auto max-w-6xl px-4 pb-8 font-mono text-xs text-muted-foreground md:px-6">
                © {new Date().getFullYear()} {SITE_NAME}
            </div>
        </footer>
    );
};
