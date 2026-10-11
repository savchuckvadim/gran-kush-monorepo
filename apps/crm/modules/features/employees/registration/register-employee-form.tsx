"use client";

import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Button, FieldInput, FieldSelect } from "@workspace/ui";

import { usePortal } from "@/modules/processes";
import { $api } from "@/modules/shared";

const schema = z.object({
    email: z.string().email("Invalid email"),
    role: z.enum(["employee", "manager", "admin"]).default("employee"),
    first_name: z.string().min(2, "Name is required"),
    last_name: z.string().optional(),
    phone: z.string().optional(),
    position: z.string().optional(),
    department: z.string().optional(),
});

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

const ROLE_OPTIONS = [
    { value: "employee", label: "employee" },
    { value: "manager", label: "manager" },
    { value: "admin", label: "admin" },
];

export function RegisterEmployeeForm() {
    const { portalSlug } = usePortal();
    const [createdEmail, setCreatedEmail] = useState<string | null>(null);
    const {
        register,
        control,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<FormInput, unknown, FormOutput>({
        resolver: zodResolver(schema),
        defaultValues: { role: "employee" },
    });

    const mutation = useMutation({
        mutationFn: async (data: FormOutput) => {
            if (!portalSlug) {
                throw new Error("Portal is required");
            }

            const { email, role, ...fields } = data;
            const response = await $api.POST("/crm/auth/employee/register", {
                body: { email, role, fields },
                headers: { "x-portal-slug": portalSlug },
            });

            if (!response.response.ok) {
                throw new Error(`Employee registration failed: ${response.response.status}`);
            }

            return email;
        },
        onSuccess: (email) => {
            setCreatedEmail(email);
            reset({ role: "employee" });
        },
    });

    return (
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-3">
            {mutation.isError && (
                <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                    Failed to register employee. Check role/permissions and try again.
                </div>
            )}
            {createdEmail && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700">
                    Employee created: {createdEmail}. They will set a password when claiming the
                    account with this email.
                </div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
                <FieldInput
                    label="Email"
                    required
                    {...register("email")}
                    error={errors.email?.message}
                />
                <FieldInput
                    label="Name"
                    required
                    {...register("first_name")}
                    error={errors.first_name?.message}
                />
                <FieldInput
                    label="Surname"
                    {...register("last_name")}
                    error={errors.last_name?.message}
                />
                <FieldInput label="Phone" {...register("phone")} error={errors.phone?.message} />
                <FieldInput
                    label="Position"
                    {...register("position")}
                    error={errors.position?.message}
                />
                <FieldInput
                    label="Department"
                    {...register("department")}
                    error={errors.department?.message}
                />
                <Controller
                    name="role"
                    control={control}
                    render={({ field }) => (
                        <FieldSelect
                            label="Role"
                            name={field.name}
                            options={ROLE_OPTIONS}
                            value={field.value ?? ""}
                            onValueChange={field.onChange}
                        />
                    )}
                />
            </div>

            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
                {isSubmitting || mutation.isPending ? "Creating..." : "Create employee"}
            </Button>
        </form>
    );
}
