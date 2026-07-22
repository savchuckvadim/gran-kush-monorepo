"use client";

import { useEffect, useState } from "react";

import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";

import {
    DynamicFormFields,
    toSubmitPayload,
    validateDynamicValues,
    type FormSchemaField,
} from "@workspace/dynamic-forms";
import { Button, FieldInput } from "@workspace/ui";

import type { MemberFormSchemaField } from "@/modules/entities/member";
import { usePortal } from "@/modules/processes";
import { API_BASE_URL } from "@/modules/shared";

type RegistrationSchemaResponse = {
    purpose: string;
    fields: MemberFormSchemaField[];
};

async function fetchRegistrationSchema(portalSlug: string): Promise<RegistrationSchemaResponse> {
    const res = await fetch(`${API_BASE_URL}/lk/auth/member/registration-schema`, {
        headers: { "x-portal-slug": portalSlug },
    });
    if (!res.ok) {
        throw new Error(`Failed to load registration schema: ${res.status}`);
    }
    return res.json() as Promise<RegistrationSchemaResponse>;
}

const credentialsSchema = z.object({
    email: z.string().email("Invalid email"),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
            message: "Password must contain uppercase, lowercase and number",
        }),
});

export function RegisterMemberForm() {
    const { portalSlug } = usePortal();
    const [createdEmail, setCreatedEmail] = useState<string | null>(null);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({});
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [credentialErrors, setCredentialErrors] = useState<{
        email?: string;
        password?: string;
    }>({});

    const schemaQuery = useQuery({
        queryKey: ["member-registration-schema", portalSlug],
        queryFn: () => fetchRegistrationSchema(portalSlug!),
        enabled: !!portalSlug,
    });

    const fields = schemaQuery.data?.fields ?? [];

    useEffect(() => {
        if (!fields.length) return;
        setFieldValues((prev) => {
            const next = { ...prev };
            for (const f of fields) {
                if (!(f.fieldKey in next) && f.defaultValueJson != null) {
                    next[f.fieldKey] = f.defaultValueJson as unknown;
                }
            }
            return next;
        });
    }, [fields]);

    const schemaFields = fields as FormSchemaField[];

    const mutation = useMutation({
        mutationFn: async () => {
            if (!portalSlug) {
                throw new Error("Portal is required");
            }

            const credParsed = credentialsSchema.safeParse({ email, password });
            if (!credParsed.success) {
                const flat = credParsed.error.flatten().fieldErrors;
                setCredentialErrors({
                    email: flat.email?.[0],
                    password: flat.password?.[0],
                });
                throw new Error("Invalid credentials");
            }
            setCredentialErrors({});

            const validationErrors = validateDynamicValues(schemaFields, fieldValues);
            setFieldErrors(validationErrors);
            if (Object.keys(validationErrors).length > 0) {
                throw new Error("Проверьте заполнение полей формы");
            }

            const response = await fetch(`${API_BASE_URL}/lk/auth/member/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-portal-slug": portalSlug,
                },
                body: JSON.stringify({
                    email: credParsed.data.email,
                    password: credParsed.data.password,
                    fields: toSubmitPayload(fieldValues),
                }),
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || `Member registration failed: ${response.status}`);
            }

            return credParsed.data.email;
        },
        onSuccess: (registeredEmail) => {
            setCreatedEmail(registeredEmail);
            setEmail("");
            setPassword("");
            setFieldValues({});
        },
    });

    if (!portalSlug) {
        return <p className="text-sm text-muted-foreground">Portal context is required.</p>;
    }

    if (schemaQuery.isLoading) {
        return <p className="text-sm text-muted-foreground">Loading form…</p>;
    }

    if (schemaQuery.isError) {
        return (
            <p className="text-sm text-destructive">
                {(schemaQuery.error as Error).message ?? "Failed to load schema"}
            </p>
        );
    }

    return (
        <form
            className="space-y-3"
            onSubmit={(e) => {
                e.preventDefault();
                mutation.mutate();
            }}
        >
            {mutation.isError && (
                <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                    {(mutation.error as Error).message}
                </div>
            )}
            {createdEmail && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700">
                    Member created: {createdEmail}
                </div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
                <FieldInput
                    label="Email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={credentialErrors.email}
                />
                <FieldInput
                    label="Password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={credentialErrors.password}
                />
            </div>

            <DynamicFormFields
                fields={schemaFields}
                values={fieldValues}
                errors={fieldErrors}
                disabled={mutation.isPending}
                onChange={(key, value) =>
                    setFieldValues((prev) => ({
                        ...prev,
                        [key]: value,
                    }))
                }
            />

            <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Submitting…" : "Register member"}
            </Button>
        </form>
    );
}
