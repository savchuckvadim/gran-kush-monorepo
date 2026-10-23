import { brandMarkDataUrl } from "@workspace/brand";

import { BRAND } from "@/modules/shared/config/site";

// LogoMark of svg-defs.tsx with its gradient inlined, for images drawn by ImageResponse
// (apple-icon, opengraph-image) and the favicon (app/icon.ts).
export const LOGO_MARK_SRC = brandMarkDataUrl(BRAND);
