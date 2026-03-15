"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";

import { Check, X } from "lucide-react";
import { SignatureCanvas } from "react-signature-canvas";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

// Helper component for themed signature preview
function ThemedSignaturePreview({ src, className }: { src: string; className?: string }) {
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
            setProcessedSrc(canvas.toDataURL("image/png"));
        };
        img.onerror = () => {
            setProcessedSrc(null);
        };
        img.src = src;
    }, [src, isDark]);

    if (!isDark) {
        return <img src={src} alt="signature" className={className} />;
    }

    return (
        <>
            <canvas ref={canvasRef} className="hidden" />
            {processedSrc ? (
                <img src={processedSrc} alt="signature" className={className} />
            ) : (
                <img src={src} alt="signature" className={className} />
            )}
        </>
    );
}

export interface SignatureCanvasProps {
    value?: string;
    onChange?: (value: string | null) => void;
    error?: boolean;
    className?: string;
    placeholder?: string;
    penColor?: string;
}

export function SignatureCanvasField({
    value,
    onChange,
    error,
    className,
    placeholder = "Your signature",
    penColor,
}: SignatureCanvasProps) {
    const canvasRef = useRef<SignatureCanvas>(null);
    const [isEmpty, setIsEmpty] = useState(true);
    const { resolvedTheme } = useTheme();
    const effectivePenColor = penColor ?? (resolvedTheme === "dark" ? "#f8fafc" : "#111827");

    useEffect(() => {
        if (canvasRef.current) {
            const isEmpty = canvasRef.current.isEmpty();
            setIsEmpty(isEmpty);
            // If canvas has content but no value is saved yet, mark as unsaved
            if (!isEmpty && !value) {
                setHasUnsavedContent(true);
            } else if (isEmpty) {
                setHasUnsavedContent(false);
            }
        }
    }, [value]);

    // Periodically check if canvas has content while drawing
    useEffect(() => {
        if (!value && canvasRef.current) {
            const interval = setInterval(() => {
                if (canvasRef.current && !canvasRef.current.isEmpty()) {
                    setHasUnsavedContent(true);
                }
            }, 100);
            return () => clearInterval(interval);
        }
    }, [value]);

    const handleClear = () => {
        if (canvasRef.current) {
            canvasRef.current.clear();
        }
        setIsEmpty(true);
        setHasUnsavedContent(false);
        onChange?.(null);
    };

    const handleSave = () => {
        if (canvasRef.current && !canvasRef.current.isEmpty()) {
            const trimmedCanvas = canvasRef.current.getTrimmedCanvas();
            const width = trimmedCanvas.width;
            const height = trimmedCanvas.height;
            const sourceContext = trimmedCanvas.getContext("2d");
            const normalizedCanvas = document.createElement("canvas");
            normalizedCanvas.width = width;
            normalizedCanvas.height = height;
            const normalizedContext = normalizedCanvas.getContext("2d");

            if (!sourceContext || !normalizedContext) {
                return;
            }

            const sourceData = sourceContext.getImageData(0, 0, width, height);
            const normalizedData = normalizedContext.createImageData(width, height);

            for (let i = 0; i < sourceData.data.length; i += 4) {
                const alpha = sourceData.data[i + 3] ?? 0;
                const hasStroke = alpha > 0;

                // Store signature in canonical format independent from UI theme:
                // black strokes (RGB=0,0,0) with fully opaque alpha (255) on transparent background.
                // This ensures proper inversion in dark theme without affecting transparency.
                normalizedData.data[i] = 0; // R
                normalizedData.data[i + 1] = 0; // G
                normalizedData.data[i + 2] = 0; // B
                normalizedData.data[i + 3] = hasStroke ? 255 : 0; // Always fully opaque for strokes
            }

            normalizedContext.putImageData(normalizedData, 0, 0);
            const dataURL = normalizedCanvas.toDataURL("image/png");
            setIsEmpty(false);
            setHasUnsavedContent(false);
            onChange?.(dataURL);
        }
    };

    // Track if canvas has content but hasn't been saved yet
    const [hasUnsavedContent, setHasUnsavedContent] = useState(false);

    const handleEnd = () => {
        // Just mark that there's content, don't save automatically
        if (canvasRef.current && !canvasRef.current.isEmpty()) {
            setHasUnsavedContent(true);
        }
    };

    return (
        <div className={cn("space-y-2 ", className)}>
            <div
                className={cn(
                    "relative rounded-md border",
                    error ? "border-destructive" : value ? "border-green-500" : "border-input",
                    "bg-background"
                )}
            >
                {!value && isEmpty && (
                    <span className="pointer-events-none absolute left-3 top-3 text-sm text-muted-foreground ">
                        {placeholder}
                    </span>
                )}
                {!value && (
                    <SignatureCanvas
                        ref={canvasRef}
                        penColor={effectivePenColor}
                        canvasProps={{
                            className: "w-full h-48 cursor-crosshair rounded-xl",
                        }}
                        onEnd={handleEnd}
                    />
                )}
                {value && (
                    <div className="flex items-center justify-center w-full h-48 rounded-xl overflow-hidden">
                        <div className="relative flex items-center justify-center w-full h-full p-4">
                            <ThemedSignaturePreview
                                src={value}
                                className="max-w-full max-h-full object-contain"
                            />
                            <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
                                <Check className="size-4 text-white" />
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <div className="flex gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClear}
                    className="flex-1"
                    disabled={isEmpty && !hasUnsavedContent}
                >
                    <X className="mr-2 size-4" />
                    Clear
                </Button>
                {hasUnsavedContent && !value && (
                    <Button
                        type="button"
                        variant="default"
                        size="sm"
                        onClick={handleSave}
                        className="flex-1"
                    >
                        <Check className="mr-2 size-4" />
                        Save
                    </Button>
                )}
            </div>
        </div>
    );
}
