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
    birthday: z.string().optional(),
    address: z.string().optional(),
    isMedical: z.boolean().optional(),
    isMj: z.boolean().optional(),
    isRecreation: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

export function RegisterMemberForm() {
    const { portalSlug } = usePortal();
    const [createdEmail, setCreatedEmail] = useState<string | null>(null);
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<FormData>({
        resolver: zodResolver(schema),
    });

    const mutation = useMutation({
        mutationFn: async (data: FormData) => {
            if (!portalSlug) {
                throw new Error("Portal is required");
            }

            const response = await $api.POST("/lk/auth/member/register", {
                body: data,
                headers: { "x-portal-slug": portalSlug },
            });

            if (!response.response.ok) {
                throw new Error(`Member registration failed: ${response.response.status}`);
            }

            return data.email;
        },
        onSuccess: (email) => {
            setCreatedEmail(email);
            reset();
        },
    });

    return (
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-3">
            {mutation.isError && (
                <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                    Failed to register member. Please retry.
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
                    label="Birthday"
                    type="date"
                    {...register("birthday")}
                    error={errors.birthday?.message}
                />
                <FieldInput
                    label="Address"
                    {...register("address")}
                    error={errors.address?.message}
                />
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
                <label className="inline-flex items-center gap-2">
                    <input type="checkbox" {...register("isMedical")} />
                    <span>Medical</span>
                </label>
                <label className="inline-flex items-center gap-2">
                    <input type="checkbox" {...register("isMj")} />
                    <span>MJ</span>
                </label>
                <label className="inline-flex items-center gap-2">
                    <input type="checkbox" {...register("isRecreation")} />
                    <span>Recreation</span>
                </label>
            </div>

            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
                {isSubmitting || mutation.isPending ? "Creating..." : "Create member"}
            </Button>
        </form>
    );
}
