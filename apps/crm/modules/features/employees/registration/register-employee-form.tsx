"use client";

import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button, FieldInput } from "@workspace/ui";

import { usePortal } from "@/modules/processes";
import { $api } from "@/modules/shared";

const schema = z.object({
    email: z.string().email("Invalid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    name: z.string().min(2, "Name is required"),
    surname: z.string().optional(),
    phone: z.string().optional(),
    role: z.enum(["employee", "manager", "admin"]).default("employee"),
    position: z.string().optional(),
    department: z.string().optional(),
});

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

export function RegisterEmployeeForm() {
    const { portalSlug } = usePortal();
    const [createdEmail, setCreatedEmail] = useState<string | null>(null);
    const {
        register,
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

            const response = await $api.POST("/crm/auth/employee/register", {
                body: data,
                headers: { "x-portal-slug": portalSlug },
            });

            if (!response.response.ok) {
                throw new Error(`Employee registration failed: ${response.response.status}`);
            }

            return data.email;
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
                    Employee created: {createdEmail}
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
                    label="Password"
                    type="password"
                    required
                    {...register("password")}
                    error={errors.password?.message}
                />
                <FieldInput
                    label="Name"
                    required
                    {...register("name")}
                    error={errors.name?.message}
                />
                <FieldInput
                    label="Surname"
                    {...register("surname")}
                    error={errors.surname?.message}
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
                <label className="flex flex-col gap-1 text-sm">
                    <span className="text-foreground">Role</span>
                    <select
                        {...register("role")}
                        className="h-10 rounded-md border border-input bg-background px-3"
                    >
                        <option value="employee">employee</option>
                        <option value="manager">manager</option>
                        <option value="admin">admin</option>
                    </select>
                </label>
            </div>

            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
                {isSubmitting || mutation.isPending ? "Creating..." : "Create employee"}
            </Button>
        </form>
    );
}
