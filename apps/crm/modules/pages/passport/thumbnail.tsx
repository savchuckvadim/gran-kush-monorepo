"use client";

import { useState } from "react";

import { FileText } from "lucide-react";

/** Миниатюра файла; PDF и недоступный файл показывают значок, а «Открыть» ведёт к полному файлу. */
export function Thumbnail({ src, alt }: { src: string; alt: string }) {
    const [broken, setBroken] = useState(false);

    if (broken) {
        return (
            <span className="flex size-16 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground">
                <FileText className="size-6" aria-hidden="true" />
            </span>
        );
    }
    return (
        // eslint-disable-next-line @next/next/no-img-element -- файл приватный, отдаётся API с куками
        <img
            src={src}
            alt={alt}
            onError={() => setBroken(true)}
            className="size-16 shrink-0 rounded-md border object-cover"
            crossOrigin="use-credentials"
        />
    );
}
