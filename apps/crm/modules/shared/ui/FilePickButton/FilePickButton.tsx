"use client";

import { type ReactNode, useRef } from "react";

import { Button } from "@workspace/ui";

interface FilePickButtonProps {
    /** Типы для окна выбора файла: `.xlsx,.csv`, `image/*,application/pdf` */
    accept: string;
    onPick: (file: File) => void;
    children: ReactNode;
    disabled?: boolean;
    variant?: "default" | "outline" | "ghost";
    size?: "sm" | "default";
}

/**
 * Кнопка «выбрать файл» вместо голого `<input type="file">`: подпись в языке интерфейса, тот же
 * файл можно выбрать снова (значение поля сбрасывается после выбора).
 */
export function FilePickButton({
    accept,
    onPick,
    children,
    disabled,
    variant = "outline",
    size = "sm",
}: FilePickButtonProps) {
    const input = useRef<HTMLInputElement>(null);
    return (
        <>
            <input
                ref={input}
                type="file"
                accept={accept}
                className="hidden"
                onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) onPick(file);
                }}
            />
            <Button
                type="button"
                variant={variant}
                size={size}
                disabled={disabled}
                onClick={() => input.current?.click()}
            >
                {children}
            </Button>
        </>
    );
}
