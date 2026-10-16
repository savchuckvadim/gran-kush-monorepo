import { SITE_NAME } from "@/modules/shared/config/site";

import type { LegalFormat } from "../types";

import { renderDocx } from "./docx";
import { renderPdf } from "./pdf";
import type { PrintDoc } from "./print-doc";

import "server-only";

const CONTENT_TYPES: Record<LegalFormat, string> = {
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

/** The file as an attachment, e.g. pafpaf-privacidad-ru.pdf; the page itself stays the canonical copy. */
export const downloadResponse = async (doc: PrintDoc, slug: string, format: LegalFormat) => {
    const file = format === "pdf" ? await renderPdf(doc) : await renderDocx(doc);
    const name = `${SITE_NAME.toLowerCase()}-${slug}-${doc.locale}.${format}`;
    return new Response(new Uint8Array(file), {
        headers: {
            "Content-Type": CONTENT_TYPES[format],
            "Content-Disposition": `attachment; filename="${name}"`,
            "Cache-Control": "public, max-age=3600",
            "X-Robots-Tag": "noindex",
        },
    });
};
