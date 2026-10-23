import { brandMarkSvg } from "@workspace/brand";

import { BRAND } from "@/modules/shared/config/brand";

export const contentType = "image/svg+xml";

/** Favicon: the installation's mark as SVG, so it stays sharp at any size. */
const Icon = () => new Response(brandMarkSvg(BRAND), { headers: { "Content-Type": contentType } });

export default Icon;
