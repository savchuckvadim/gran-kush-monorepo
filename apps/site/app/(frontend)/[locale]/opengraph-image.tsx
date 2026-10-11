import { OG_ALT, OG_SIZE, renderOgImage } from "@/modules/pages/og-image";
import { DEFAULT_LOCALE, isLocale } from "@/modules/shared/config/locales";

export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = "image/png";

const Image = async ({ params }: { params: Promise<{ locale: string }> }) => {
    const { locale } = await params;
    return renderOgImage(isLocale(locale) ? locale : DEFAULT_LOCALE);
};

export default Image;
