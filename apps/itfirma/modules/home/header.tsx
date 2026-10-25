import { useTranslations } from "next-intl";

import { INSIGHTS_PATH } from "@/modules/shared/config/articles";
import { MENU_SECTIONS } from "@/modules/shared/config/routes";
import { Link } from "@/modules/shared/i18n/navigation";
import { CtaLink } from "@/modules/shared/ui/cta-link";
import { LocaleSwitch } from "@/modules/shared/ui/locale-switch";
import { Logo } from "@/modules/shared/ui/logo";
import { ModeToggle } from "@/modules/shared/ui/mode-toggle";
import { PaletteMenu } from "@/modules/shared/ui/palette-menu";

/** Sticky glass bar: wordmark, the main sections, look and language, and the request button. */
export const Header = () => {
    const t = useTranslations("nav");
    const cta = useTranslations("cta");

    return (
        <header className="sticky top-0 z-30 border-b border-border bg-background/70 backdrop-blur-md">
            <div className="wrap flex h-16 items-center justify-between gap-4">
                <Link href="/" className="shrink-0">
                    <Logo />
                </Link>
                <nav className="hidden items-center gap-6 text-sm text-muted-foreground lg:flex">
                    {MENU_SECTIONS.map((section) => (
                        <Link
                            key={section}
                            href={`/#${section}`}
                            className="transition-colors hover:text-foreground"
                        >
                            {t(section)}
                        </Link>
                    ))}
                    <Link href={INSIGHTS_PATH} className="transition-colors hover:text-foreground">
                        {t("insights")}
                    </Link>
                </nav>
                <div className="flex items-center gap-2 sm:gap-3">
                    <ModeToggle />
                    <PaletteMenu />
                    <LocaleSwitch />
                    <CtaLink className="hidden md:inline-flex">{cta("request")}</CtaLink>
                </div>
            </div>
        </header>
    );
};
