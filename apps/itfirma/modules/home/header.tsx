import { useTranslations } from "next-intl";

import { HOME_SECTIONS } from "@/modules/shared/config/routes";
import { Link } from "@/modules/shared/i18n/navigation";
import { LocaleSwitch } from "@/modules/shared/ui/locale-switch";
import { Logo } from "@/modules/shared/ui/logo";
import { ModeSwitch } from "@/modules/shared/ui/mode-switch";
import { SkinSwitch } from "@/modules/shared/ui/skin-switch";

/** Sticky glass bar: wordmark, anchors of the home page, look and language switches. */
export const Header = () => {
    const t = useTranslations("nav");

    return (
        <header className="sticky top-0 z-30 border-b border-border bg-background/70 backdrop-blur-md">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
                <Link href="/" className="shrink-0">
                    <Logo />
                </Link>
                <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
                    {HOME_SECTIONS.map((section) => (
                        <Link
                            key={section}
                            href={`/#${section}`}
                            className="transition-colors hover:text-foreground"
                        >
                            {t(section)}
                        </Link>
                    ))}
                </nav>
                <div className="flex items-center gap-2 sm:gap-3">
                    {/* on a phone the swatches would push the bar past the screen: they live in the footer */}
                    <div className="hidden sm:block">
                        <SkinSwitch />
                    </div>
                    <ModeSwitch />
                    <LocaleSwitch />
                </div>
            </div>
        </header>
    );
};
