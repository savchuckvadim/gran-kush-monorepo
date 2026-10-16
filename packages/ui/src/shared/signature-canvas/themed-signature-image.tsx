"use client";

import { useEffect, useRef, useState } from "react";

import { useIsDarkTheme } from "@workspace/ui/hooks/use-is-dark-theme";

/**
 * A stored signature (black strokes on transparent) shown readable in both themes: in the dark
 * theme the strokes are inverted to white, the transparency stays.
 */
export function ThemedSignatureImage({
    src,
    alt,
    className,
}: {
    src: string;
    alt: string;
    className?: string;
}) {
    const isDark = useIsDarkTheme();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [processed, setProcessed] = useState<{ src: string; dataUrl: string } | null>(null);

    useEffect(() => {
        if (!isDark || !canvasRef.current) {
            return;
        }

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Invert only RGB channels, preserve alpha
            for (let i = 0; i < data.length; i += 4) {
                const alpha = data[i + 3];
                if (alpha !== undefined && alpha > 0) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    if (r !== undefined && g !== undefined && b !== undefined) {
                        data[i] = 255 - r;
                        data[i + 1] = 255 - g;
                        data[i + 2] = 255 - b;
                    }
                }
            }

            ctx.putImageData(imageData, 0, 0);
            setProcessed({ src, dataUrl: canvas.toDataURL("image/png") });
        };
        img.onerror = () => {
            setProcessed(null);
        };
        img.src = src;
    }, [src, isDark]);

    const processedSrc = isDark && processed?.src === src ? processed.dataUrl : null;

    if (!isDark) {
        return <img src={src} alt={alt} className={className} />;
    }

    return (
        <>
            <canvas ref={canvasRef} className="hidden" />
            <img src={processedSrc ?? src} alt={alt} className={className} />
        </>
    );
}
