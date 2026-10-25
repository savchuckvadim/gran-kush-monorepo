import { useTranslations } from "next-intl";

import { CtaLink } from "@/modules/shared/ui/cta-link";
import { LocaleMenu } from "@/modules/shared/ui/locale-menu";
import { ModeToggle } from "@/modules/shared/ui/mode-toggle";
import { PaletteMenu } from "@/modules/shared/ui/palette-menu";

/** Phones and tablets: look, language and the request button in a glass pill at the top right. */
export const MobileTopControls = () => {
    const cta = useTranslations("cta");

    return (
        <div className="glass fixed top-3 right-3 z-40 flex items-center gap-0.5 rounded-full p-1 lg:hidden">
            <ModeToggle />
            <PaletteMenu />
            <LocaleMenu />
            <CtaLink size="sm" arrow={false} className="ml-0.5 max-[359px]:hidden">
                {cta("request")}
            </CtaLink>
        </div>
    );
};
