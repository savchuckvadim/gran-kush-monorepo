"use client";

import { QRCodeSVG } from "qrcode.react";

import { cn } from "../../lib/utils";

export interface QrCodeDisplayProps {
    /**
     * Encrypted payload string to encode in QR code
     */
    value: string;
    /**
     * Size of the QR code in pixels
     * @default 256
     */
    size?: number;
    /**
     * Error correction level
     * @default "H"
     */
    level?: "L" | "M" | "Q" | "H";
    /**
     * Additional CSS classes
     */
    className?: string;
    /**
     * Background color (for dark mode support)
     * @default "white"
     */
    bgColor?: string;
    /**
     * Foreground color
     * @default "black"
     */
    fgColor?: string;
    /**
     * Include margin around QR code
     * @default true
     */
    includeMargin?: boolean;
}

/**
 * Reusable QR Code Display Component
 * Generates QR code from encrypted payload string
 */
export function QrCodeDisplay({
    value,
    size = 256,
    level = "H",
    className,
    bgColor = "white",
    fgColor = "black",
    includeMargin = true,
}: QrCodeDisplayProps) {
    if (!value) {
        return null;
    }

    return (
        <div className={cn("flex items-center justify-center", className)}>
            <QRCodeSVG
                value={value}
                size={size}
                level={level}
                bgColor={bgColor}
                fgColor={fgColor}
                includeMargin={includeMargin}
            />
        </div>
    );
}
