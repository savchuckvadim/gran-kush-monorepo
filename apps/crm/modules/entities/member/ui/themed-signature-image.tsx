"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";

interface ThemedSignatureImageProps {
    src: string;
    alt: string;
    className?: string;
}

export function ThemedSignatureImage({ src, alt, className }: ThemedSignatureImageProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === "dark";
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [processedSrc, setProcessedSrc] = useState<string | null>(null);

    useEffect(() => {
        if (!isDark || !canvasRef.current) {
            setProcessedSrc(null);
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

            // Draw original image
            ctx.drawImage(img, 0, 0);

            // Get image data
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Invert only RGB channels, preserve alpha
            for (let i = 0; i < data.length; i += 4) {
                const alpha = data[i + 3];
                // Only invert if pixel is not fully transparent
                if (alpha !== undefined && alpha > 0) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    if (r !== undefined && g !== undefined && b !== undefined) {
                        data[i] = 255 - r; // R
                        data[i + 1] = 255 - g; // G
                        data[i + 2] = 255 - b; // B
                        // Alpha stays the same
                    }
                }
            }

            ctx.putImageData(imageData, 0, 0);
            setProcessedSrc(canvas.toDataURL("image/png"));
        };
        img.onerror = () => {
            setProcessedSrc(null);
        };
        img.src = src;
    }, [src, isDark]);

    if (!isDark) {
        return <img src={src} alt={alt} className={className} />;
    }

    return (
        <>
            <canvas ref={canvasRef} className="hidden" />
            {processedSrc ? (
                <img src={processedSrc} alt={alt} className={className} />
            ) : (
                <img src={src} alt={alt} className={className} />
            )}
        </>
    );
}
