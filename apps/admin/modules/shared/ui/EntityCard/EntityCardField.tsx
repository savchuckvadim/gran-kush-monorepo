"use client";

import * as React from "react";

import { cn } from "@workspace/ui/lib/utils";

export interface EntityCardFieldProps {
    label: React.ReactNode;
    children: React.ReactNode;
    /** Подпись под значением, на всю ширину */
    description?: React.ReactNode;
    className?: string;
    labelClassName?: string;
    valueClassName?: string;
}

/**
 * Строка поля сущности: компактная типографика (≈11–12px).
 */
export function EntityCardField({
    label,
    children,
    description,
    className,
    labelClassName,
    valueClassName,
}: EntityCardFieldProps) {
    return (
        <div
            className={cn(
                "grid gap-1 border-b border-border/50 py-2 last:border-b-0 sm:grid-cols-[minmax(5.5rem,10rem)_minmax(0,1fr)] sm:items-start sm:gap-x-3",
                className
            )}
        >
            <div
                className={cn(
                    "pt-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground",
                    labelClassName
                )}
            >
                {label}
            </div>
            <div className={cn("min-w-0 text-xs leading-snug text-foreground", valueClassName)}>
                {children}
            </div>
            {description ? (
                <p className="text-[10px] leading-snug text-muted-foreground sm:col-span-2">
                    {description}
                </p>
            ) : null}
        </div>
    );
}

export interface EntityCardDocumentFieldProps {
    label: React.ReactNode;
    previewSrc?: string | null;
    previewAlt?: string;
    /** Действия / подпись справа от превью */
    children?: React.ReactNode;
    emptyLabel?: React.ReactNode;
    className?: string;
}

/**
 * Поле-документ: миниатюра + произвольный контент (ссылки, статус).
 */
export function EntityCardDocumentField({
    label,
    previewSrc,
    previewAlt,
    children,
    emptyLabel,
    className,
}: EntityCardDocumentFieldProps) {
    return (
        <EntityCardField label={label} className={className}>
            <div className="flex flex-wrap items-start gap-3">
                <div className="relative h-[4.5rem] w-[6.25rem] shrink-0 overflow-hidden rounded-md border border-border/80 bg-muted/30">
                    {previewSrc ? (
                        <img
                            src={previewSrc}
                            alt={previewAlt ?? ""}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center px-1 text-center text-[10px] leading-tight text-muted-foreground">
                            {emptyLabel ?? "Нет превью"}
                        </div>
                    )}
                </div>
                {children ? <div className="min-w-0 flex-1">{children}</div> : null}
            </div>
        </EntityCardField>
    );
}
