import { ImageResponse } from "next/og";

import { BRAND_MARK_DATA_URL } from "@workspace/ui/lib/brand-mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// The mark on black, as on the product site: iOS paints a transparent icon black anyway.
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
            <img src={BRAND_MARK_DATA_URL} width={128} height={128} alt="" />
        </div>,
        size
    );

export default AppleIcon;
