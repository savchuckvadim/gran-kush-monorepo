"use client";

import { cn } from "../../lib/utils";

import { QrCodeDisplay } from "./qr-code-display";

export interface ScannableQrCodeProps {
    value: string;
    /** @default 256 */
    size?: number;
    className?: string;
}

/**
 * Код для сканера на входе. Всегда тёмный на белом, независимо от темы: сканер читает контраст,
 * а светлый код на тёмном фоне многие не берут. Уровень коррекции M — модули крупнее, код читается
 * с первого раза; белая рамка вокруг — тихая зона, без неё край кода сливается с фоном.
 */
export function ScannableQrCode({ value, size = 256, className }: ScannableQrCodeProps) {
    return (
        <div className={cn("mx-auto w-fit rounded-xl bg-white p-3", className)}>
            <QrCodeDisplay
                value={value}
                size={size}
                level="M"
                bgColor="#ffffff"
                fgColor="#000000"
                includeMargin={false}
            />
        </div>
    );
}
