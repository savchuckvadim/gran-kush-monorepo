import { partnerPrintDoc } from "@/modules/legal/download/print-doc";
import { downloadResponse } from "@/modules/legal/download/response";
import { isLegalFormat } from "@/modules/legal/types";
import { isLocale } from "@/modules/shared/config/locales";

export const GET = async (
    _request: Request,
    { params }: { params: Promise<{ locale: string; format: string }> }
) => {
    const { locale, format } = await params;
    if (!isLocale(locale) || !isLegalFormat(format)) return new Response(null, { status: 404 });
    return downloadResponse(partnerPrintDoc(locale), "partners", format);
};
