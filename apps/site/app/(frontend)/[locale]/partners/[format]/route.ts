import { partnerPrintDoc } from "@/modules/legal/download/print-doc";
import { downloadResponse } from "@/modules/legal/download/response";
import { PARTNER_BRIEF_SITE } from "@/modules/legal/partner-content";
import { isLegalFormat } from "@/modules/legal/types";
import { isLocale } from "@/modules/shared/config/locales";
import { SITE } from "@/modules/shared/config/site";

export const GET = async (
    _request: Request,
    { params }: { params: Promise<{ locale: string; format: string }> }
) => {
    const { locale, format } = await params;
    if (SITE !== PARTNER_BRIEF_SITE || !isLocale(locale) || !isLegalFormat(format)) {
        return new Response(null, { status: 404 });
    }
    return downloadResponse(partnerPrintDoc(locale), "partners", format);
};
