"use client";

import { useCallback, useState } from "react";

import { Upload, X } from "lucide-react";
import { useDropzone } from "react-dropzone";

import { Button } from "@workspace/ui/components/button";
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldError,
    FieldLabel,
} from "@workspace/ui/components/field";
import { cn } from "@workspace/ui/lib/utils";

export interface FileUploadProps {
    value?: File | null;
    onChange?: (file: File | null) => void;
    label?: string;
    error?: string;
    helperText?: string;
    required?: boolean;
    accept?: string;
    maxSize?: number; // in bytes
    className?: string;
}

export function FileUpload({
    value,
    onChange,
    label,
    error,
    helperText,
    required,
    accept = "image/*",
    maxSize = 5 * 1024 * 1024, // 5MB default
    className,
}: FileUploadProps) {
    const [preview, setPreview] = useState<string | null>(null);

    const onDrop = useCallback(
        (acceptedFiles: File[]) => {
            const file = acceptedFiles[0];
            if (file) {
                onChange?.(file);
                // Create preview for images
                if (file.type.startsWith("image/")) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        setPreview(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                }
            }
        },
        [onChange]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: accept ? { [accept]: [] } : undefined,
        maxSize,
        multiple: false,
    });

    const handleRemove = () => {
        onChange?.(null);
        setPreview(null);
    };

    return (
        <Field className={className} data-invalid={error ? "true" : undefined}>
            {label && (
                <FieldLabel>
                    {label}
                    {required && <span className="text-destructive ml-1">*</span>}
                </FieldLabel>
            )}
            <FieldContent>
                {value ? (
                    <div className="relative rounded-md border border-input p-4">
                        {preview ? (
                            <div className="relative">
                                <img
                                    src={preview}
                                    alt="Preview"
                                    className="max-h-48 w-full rounded-md object-contain"
                                />
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    className="absolute right-2 top-2"
                                    onClick={handleRemove}
                                >
                                    <X className="size-4" />
                                </Button>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between">
                                <span className="text-sm">{value.name}</span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleRemove}
                                >
                                    <X className="size-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div
                        {...getRootProps()}
                        className={cn(
                            "border-2 border-dashed rounded-md p-8 text-center cursor-pointer transition-colors",
                            isDragActive
                                ? "border-primary bg-primary/5"
                                : "border-input hover:border-primary/50",
                            error && "border-destructive"
                        )}
                    >
                        <input {...getInputProps()} />
                        <div className="flex flex-col items-center gap-2">
                            <Upload className="size-8 text-muted-foreground" />
                            <div className="text-sm">
                                <span className="text-primary font-medium">Click to upload</span> or
                                drag and drop
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {accept === "image/*"
                                    ? "PNG, JPG, JPEG up to 5MB"
                                    : "File up to 5MB"}
                            </div>
                        </div>
                    </div>
                )}
                {helperText && !error && <FieldDescription>{helperText}</FieldDescription>}
                {error && <FieldError>{error}</FieldError>}
            </FieldContent>
        </Field>
    );
}
