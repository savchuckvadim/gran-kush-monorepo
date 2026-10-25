import { useTranslations } from "next-intl";

import { INSIGHTS_PATH } from "@/modules/shared/config/articles";
import { MENU_SECTIONS } from "@/modules/shared/config/routes";
import { Link } from "@/modules/shared/i18n/navigation";
import { CtaLink } from "@/modules/shared/ui/cta-link";
import { LocaleMenu } from "@/modules/shared/ui/locale-menu";
import { Logo } from "@/modules/shared/ui/logo";
import { ModeToggle } from "@/modules/shared/ui/mode-toggle";
import { PaletteMenu } from "@/modules/shared/ui/palette-menu";

import { MobileBar } from "./mobile-bar";
import { MobileTopControls } from "./mobile-top-controls";

/**
 * Desktop (1024px and wider): a sticky glass bar with the wordmark, the sections, mode, palette,
 * language and the request button. Below that, after the PafPaf site: a glass capsule at the
 * bottom of the screen (`MobileBar`) and a glass pill of controls at the top (`MobileTopControls`).
 */
export const Header = () => {
    const t = useTranslations("nav");
    const cta = useTranslations("cta");

    return (
        <>
            <header className="sticky top-0 z-30 hidden border-b border-border bg-background/70 backdrop-blur-md lg:block">
                <div className="wrap flex h-16 items-center justify-between gap-4">
                    <Link href="/" className="shrink-0">
                        <Logo />
                    </Link>
                    <nav className="flex items-center gap-6 text-sm text-muted-foreground">
                        {MENU_SECTIONS.map((section) => (
                            <Link
                                key={section}
                                href={`/#${section}`}
                                className="transition-colors hover:text-foreground"
                            >
                                {t(section)}
                            </Link>
                        ))}
                        <Link
                            href={INSIGHTS_PATH}
                            className="transition-colors hover:text-foreground"
                        >
                            {t("insights")}
                        </Link>
                    </nav>
                    <div className="flex items-center gap-2">
                        <ModeToggle />
                        <PaletteMenu />
                        <LocaleMenu />
                        <CtaLink className="ml-1">{cta("request")}</CtaLink>
                    </div>
                </div>
            </header>
            <MobileTopControls />
            <MobileBar />
        </>
    );
};
