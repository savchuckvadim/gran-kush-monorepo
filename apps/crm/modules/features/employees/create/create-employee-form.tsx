"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button, FieldInput } from "@workspace/ui";

import { RoleSelect } from "@/modules/entities/access";
import { useCreateEmployee } from "@/modules/entities/employee";

import { CreateEmployeeError } from "./create-employee-error";
import {
    buildEmployeeFormSchema,
    type EmployeeFormValues,
    EMPTY_EMPLOYEE_FORM,
    toCreateEmployeePayload,
} from "./employee-form-schema";

/**
 * Новый сотрудник по email: аккаунт без пароля, пароль сотрудник задаёт сам, регистрируясь с
 * этим адресом (письма API не шлёт). Список сотрудников перечитывается сразу после создания.
 */
export function CreateEmployeeForm({ onCreated }: { onCreated: () => void }) {
    const t = useTranslations("crm.employees.create");
    const create = useCreateEmployee();
    const schema = useMemo(() => buildEmployeeFormSchema(t), [t]);

    const {
        register,
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<EmployeeFormValues>({
        resolver: zodResolver(schema),
        defaultValues: EMPTY_EMPLOYEE_FORM,
    });

    const submit = (values: EmployeeFormValues) =>
        create.mutate(toCreateEmployeePayload(values), {
            onSuccess: () => {
                toast.success(t("created", { email: values.email }), {
                    description: t("createdHint"),
                });
                onCreated();
            },
        });

    return (
        <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
            <div className="grid gap-3 sm:grid-cols-2">
                <FieldInput
                    label={t("email")}
                    type="email"
                    autoComplete="off"
                    required
                    {...register("email")}
                    error={errors.email?.message}
                />
                <Controller
                    name="role"
                    control={control}
                    render={({ field }) => (
                        <RoleSelect
                            label={t("role")}
                            name={field.name}
                            value={field.value}
                            onValueChange={field.onChange}
                        />
                    )}
                />
                <FieldInput
                    label={t("firstName")}
                    required
                    {...register("firstName")}
                    error={errors.firstName?.message}
                />
                <FieldInput label={t("lastName")} {...register("lastName")} />
                <FieldInput label={t("phone")} type="tel" {...register("phone")} />
                <FieldInput label={t("position")} {...register("position")} />
                <FieldInput label={t("department")} {...register("department")} />
            </div>

            {create.error ? <CreateEmployeeError error={create.error} /> : null}

            <Button type="submit" className="w-full" disabled={create.isPending}>
                {create.isPending ? t("submitting") : t("submit")}
            </Button>
        </form>
    );
}
