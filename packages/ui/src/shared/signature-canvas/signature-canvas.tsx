"use client";

import { useRef, useState } from "react";

import { Check, X } from "lucide-react";
import { SignatureCanvas } from "react-signature-canvas";

import { Button } from "@workspace/ui/components/button";
import { useIsDarkTheme } from "@workspace/ui/hooks/use-is-dark-theme";
import { cn } from "@workspace/ui/lib/utils";

import { ThemedSignatureImage } from "./themed-signature-image";

export interface SignatureCanvasProps {
    /** The saved signature as a PNG data URL; while it is set the canvas shows it */
    value?: string;
    /** The saved signature, or `null` when it is cleared */
    onChange?: (value: string | null) => void;
    error?: boolean;
    className?: string;
    placeholder?: string;
    penColor?: string;
    /** Button labels in the interface language */
    labels: { clear: string; save: string };
}

/** The drawn signature in a canonical form: black strokes on transparent, whatever the theme. */
const toCanonicalPng = (source: HTMLCanvasElement): string | null => {
    const { width, height } = source;
    const sourceContext = source.getContext("2d");
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!sourceContext || !context) return null;

    const sourceData = sourceContext.getImageData(0, 0, width, height);
    const data = context.createImageData(width, height);
    for (let i = 0; i < sourceData.data.length; i += 4) {
        // black strokes, fully opaque: the dark theme can then invert them without touching alpha
        data.data[i + 3] = (sourceData.data[i + 3] ?? 0) > 0 ? 255 : 0;
    }
    context.putImageData(data, 0, 0);
    return canvas.toDataURL("image/png");
};

/** Draw a signature with a finger or a mouse, then save it as a PNG; clearing starts over. */
export function SignatureCanvasField({
    value,
    onChange,
    error,
    className,
    placeholder,
    penColor,
    labels,
}: SignatureCanvasProps) {
    const canvasRef = useRef<SignatureCanvas>(null);
    // strokes on the canvas that are not saved yet
    const [drawn, setDrawn] = useState(false);
    const isDark = useIsDarkTheme();
    const effectivePenColor = penColor ?? (isDark ? "#f8fafc" : "#111827");

    const handleClear = () => {
        canvasRef.current?.clear();
        setDrawn(false);
        onChange?.(null);
    };

    const handleSave = () => {
        const canvas = canvasRef.current;
        if (!canvas || canvas.isEmpty()) return;
        const dataUrl = toCanonicalPng(canvas.getTrimmedCanvas());
        if (!dataUrl) return;
        setDrawn(false);
        onChange?.(dataUrl);
    };

    return (
        <div className={cn("space-y-2", className)}>
            <div
                className={cn(
                    "relative rounded-md border bg-background",
                    error ? "border-destructive" : value ? "border-green-500" : "border-input"
                )}
            >
                {!value && !drawn && placeholder && (
                    <span className="pointer-events-none absolute top-3 left-3 text-sm text-muted-foreground">
                        {placeholder}
                    </span>
                )}
                {value ? (
                    <div className="relative flex h-48 w-full items-center justify-center overflow-hidden rounded-xl p-4">
                        <ThemedSignatureImage
                            src={value}
                            alt={placeholder ?? ""}
                            className="max-h-full max-w-full object-contain"
                        />
                        <div className="absolute top-2 right-2 rounded-full bg-green-500 p-1">
                            <Check className="size-4 text-white" />
                        </div>
                    </div>
                ) : (
                    <SignatureCanvas
                        ref={canvasRef}
                        penColor={effectivePenColor}
                        canvasProps={{ className: "h-48 w-full cursor-crosshair rounded-xl" }}
                        onBegin={() => setDrawn(true)}
                    />
                )}
            </div>
            <div className="flex gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClear}
                    className="flex-1"
                    disabled={!drawn && !value}
                >
                    <X className="mr-2 size-4" />
                    {labels.clear}
                </Button>
                {drawn && !value && (
                    <Button
                        type="button"
                        variant="default"
                        size="sm"
                        onClick={handleSave}
                        className="flex-1"
                    >
                        <Check className="mr-2 size-4" />
                        {labels.save}
                    </Button>
                )}
            </div>
        </div>
    );
}
