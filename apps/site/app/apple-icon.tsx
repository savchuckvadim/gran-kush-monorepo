import { ImageResponse } from "next/og";

import { LOGO_MARK_SRC } from "@/modules/sites/pafpaf/ui/logo-mark-image";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// The mark on the site's black: iOS would paint a transparent icon black anyway.
const AppleIcon = () =>
    new ImageResponse(
        <div
            style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#000",
            }}
        >
            {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse draws plain img */}
            <img src={LOGO_MARK_SRC} width={128} height={128} alt="" />
        </div>,
        size
    );

export default AppleIcon;
