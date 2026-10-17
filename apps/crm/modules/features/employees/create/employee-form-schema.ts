import type { useTranslations } from "next-intl";

import { z } from "zod";

import { type CreateEmployeePayload, EMPLOYEE_FIELD } from "@/modules/entities/employee";

type Translate = ReturnType<typeof useTranslations>;

/** Поля формы нового сотрудника; `t` — `crm.employees.create`. Правила — как у `CreateEmployeeDto`. */
export const buildEmployeeFormSchema = (t: Translate) =>
    z.object({
        email: z.string().trim().email(t("emailInvalid")),
        /** Ключ роли клуба */
        role: z.string().min(1),
        firstName: z.string().trim().min(1, t("firstNameRequired")),
        lastName: z.string().trim(),
        phone: z.string().trim(),
        position: z.string().trim(),
        department: z.string().trim(),
    });

export type EmployeeFormValues = z.infer<ReturnType<typeof buildEmployeeFormSchema>>;

export const EMPTY_EMPLOYEE_FORM: EmployeeFormValues = {
    email: "",
    role: "employee",
    firstName: "",
    lastName: "",
    phone: "",
    position: "",
    department: "",
};

/** Профиль уходит динамическими полями; пустые не шлём, чтобы не затирать ими значения по умолчанию. */
export const toCreateEmployeePayload = (values: EmployeeFormValues): CreateEmployeePayload => {
    const profile: Record<string, string> = {
        [EMPLOYEE_FIELD.firstName]: values.firstName,
        [EMPLOYEE_FIELD.lastName]: values.lastName,
        [EMPLOYEE_FIELD.phone]: values.phone,
        [EMPLOYEE_FIELD.position]: values.position,
        [EMPLOYEE_FIELD.department]: values.department,
    };
    return {
        email: values.email,
        role: values.role,
        fields: Object.fromEntries(Object.entries(profile).filter(([, value]) => value !== "")),
    };
};
