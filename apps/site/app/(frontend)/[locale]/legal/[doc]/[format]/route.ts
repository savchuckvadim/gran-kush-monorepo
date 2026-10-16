import { legalPrintDoc } from "@/modules/legal/download/print-doc";
import { downloadResponse } from "@/modules/legal/download/response";
import { isLegalDoc, isLegalFormat } from "@/modules/legal/types";
import { isLocale } from "@/modules/shared/config/locales";

export const GET = async (
    _request: Request,
    { params }: { params: Promise<{ locale: string; doc: string; format: string }> }
) => {
    const { locale, doc, format } = await params;
    if (!isLocale(locale) || !isLegalDoc(doc) || !isLegalFormat(format)) {
        return new Response(null, { status: 404 });
    }
    return downloadResponse(legalPrintDoc(doc, locale), doc, format);
};
