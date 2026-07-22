"use client";

import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";

import { getApiErrorMessage } from "@workspace/api-client/core";
import { Button, FieldInput, FileUpload, SignatureCanvasField } from "@workspace/ui";

import { $api } from "@/modules/shared/api";

type AccountDocument = {
    id: string;
    type: string;
    side: string;
    number: string | null;
    createdAt: string;
};

function toBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
    });
}

/** Документы и подпись аккаунта — переиспользуются при вступлении в клубы. */
export default function AccountDocumentsPage() {
    const queryClient = useQueryClient();
    const [docType, setDocType] = useState("passport");
    const [docNumber, setDocNumber] = useState("");
    const [docSide, setDocSide] = useState<"front" | "back" | "single">("single");
    const [file, setFile] = useState<File | null>(null);
    const [signature, setSignature] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const documentsQuery = useQuery({
        queryKey: ["account-documents"],
        queryFn: async () => {
            const res = await $api.GET("/lk/account/documents");
            return res.data as
                | { documents: AccountDocument[]; hasSignature: boolean }
                | undefined;
        },
    });

    const invalidate = () =>
        queryClient.invalidateQueries({ queryKey: ["account-documents"] });

    const uploadMutation = useMutation({
        mutationFn: async () => {
            if (!file) {
                throw new Error("Выберите файл");
            }
            const res = await $api.POST("/lk/account/documents", {
                body: {
                    type: docType,
                    side: docSide,
                    number: docNumber || undefined,
                    file: await toBase64(file),
                },
            });
            if (res.error) throw res.error;
            return res.data;
        },
        onSuccess: () => {
            setFile(null);
            setError(null);
            void invalidate();
        },
        onError: (e) => setError(getApiErrorMessage(e)),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await $api.DELETE("/lk/account/documents/{id}", {
                params: { path: { id } },
            });
            if (res.error) throw res.error;
        },
        onSuccess: () => void invalidate(),
        onError: (e) => setError(getApiErrorMessage(e)),
    });

    const signatureMutation = useMutation({
        mutationFn: async () => {
            if (!signature) {
                throw new Error("Поставьте подпись");
            }
            const res = await $api.PUT("/lk/account/signature", {
                body: { file: signature },
            });
            if (res.error) throw res.error;
        },
        onSuccess: () => {
            setSignature(null);
            setError(null);
            void invalidate();
        },
        onError: (e) => setError(getApiErrorMessage(e)),
    });

    return (
        <div className="mx-auto max-w-3xl px-4 py-10">
            <h1 className="mb-2 text-2xl font-bold">Документы аккаунта</h1>
            <p className="mb-6 text-sm text-muted-foreground">
                Документы и подпись хранятся в вашем аккаунте и автоматически передаются клубам
                при вступлении.
            </p>

            {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

            <div className="mb-8 space-y-3">
                {(documentsQuery.data?.documents ?? []).map((doc) => (
                    <div
                        key={doc.id}
                        className="flex items-center justify-between rounded-xl border p-3"
                    >
                        <div>
                            <p className="text-sm font-medium">
                                {doc.type} ({doc.side})
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {doc.number ? `№ ${doc.number} · ` : ""}
                                {new Date(doc.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(doc.id)}
                            disabled={deleteMutation.isPending}
                        >
                            <Trash2 className="size-4" />
                        </Button>
                    </div>
                ))}
                {documentsQuery.data && documentsQuery.data.documents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Документы ещё не загружены.</p>
                ) : null}
            </div>

            <div className="mb-8 space-y-4 rounded-xl border p-4">
                <h2 className="font-semibold">Загрузить документ</h2>
                <div className="grid gap-4 md:grid-cols-3">
                    <FieldInput
                        label="Тип"
                        value={docType}
                        onChange={(e) => setDocType(e.target.value)}
                        error={undefined}
                    />
                    <FieldInput
                        label="Номер"
                        value={docNumber}
                        onChange={(e) => setDocNumber(e.target.value)}
                        error={undefined}
                    />
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium">Сторона</label>
                        <select
                            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                            value={docSide}
                            onChange={(e) =>
                                setDocSide(e.target.value as "front" | "back" | "single")
                            }
                        >
                            <option value="single">Один файл</option>
                            <option value="front">Лицевая</option>
                            <option value="back">Обратная</option>
                        </select>
                    </div>
                </div>
                <FileUpload
                    label="Файл"
                    value={file}
                    onChange={setFile}
                    accept="image/*,application/pdf"
                    error={undefined}
                />
                <Button
                    onClick={() => uploadMutation.mutate()}
                    disabled={uploadMutation.isPending || !file}
                >
                    {uploadMutation.isPending ? "Загрузка…" : "Загрузить"}
                </Button>
            </div>

            <div className="space-y-4 rounded-xl border p-4">
                <h2 className="font-semibold">
                    Подпись{" "}
                    {documentsQuery.data?.hasSignature ? (
                        <span className="text-xs font-normal text-muted-foreground">
                            (сохранена)
                        </span>
                    ) : null}
                </h2>
                <SignatureCanvasField
                    value={signature || undefined}
                    onChange={setSignature}
                    error={false}
                />
                <Button
                    onClick={() => signatureMutation.mutate()}
                    disabled={signatureMutation.isPending || !signature}
                >
                    {signatureMutation.isPending ? "Сохранение…" : "Сохранить подпись"}
                </Button>
            </div>
        </div>
    );
}
