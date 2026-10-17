"use client";

import { useTranslations } from "next-intl";

import { Briefcase, Mail, Phone } from "lucide-react";

import { Badge, InitialsAvatar } from "@workspace/ui";
import { hueOf } from "@workspace/ui/lib/color";

import { RoleBadge } from "@/modules/entities/access";
import {
    type Employee,
    EMPLOYEE_FIELD,
    employeeFieldText,
    employeeName,
    EmployeeStatusBadge,
} from "@/modules/entities/employee";

import type { EmployeeAccess } from "../hooks/use-employee-access";

import { EmployeeHeroActions } from "./EmployeeHeroActions";

interface EmployeeHeroProps {
    employee: Employee;
    access: EmployeeAccess;
}

/** Кто это: портрет, имя, роль, доступ и как связаться. Администратору — смена роли и доступа. */
export function EmployeeHero({ employee, access }: EmployeeHeroProps) {
    const t = useTranslations("crm.employees.card");
    const name = employeeName(employee);
    const hue = hueOf(name);
    const phone = employeeFieldText(employee, EMPLOYEE_FIELD.phone);
    const work = [
        employeeFieldText(employee, EMPLOYEE_FIELD.position),
        employeeFieldText(employee, EMPLOYEE_FIELD.department),
    ].filter(Boolean);

    return (
        <section
            data-slot="employee-hero"
            className="relative overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10"
        >
            {/* отсвет цвета сотрудника — того же, что у портрета */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                    background: `radial-gradient(120% 140% at 0% 0%, oklch(0.72 0.14 ${hue} / 0.22), transparent 55%)`,
                }}
            />
            <div className="relative flex flex-col gap-4 p-4 sm:flex-row sm:items-center md:p-6">
                <InitialsAvatar
                    name={name}
                    colorful
                    className="size-16 text-xl ring-4 ring-background md:size-20 md:text-2xl"
                />

                <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <h1 className="min-w-0 truncate text-2xl font-semibold tracking-tight md:text-3xl">
                        {name}
                    </h1>
                    <div className="flex flex-wrap items-center gap-1.5">
                        <RoleBadge role={employee.role} />
                        <EmployeeStatusBadge isActive={employee.isActive} />
                        {access.isSelf && <Badge variant="outline">{t("you")}</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <a
                            href={`mailto:${employee.email}`}
                            className="inline-flex min-w-0 items-center gap-1.5 hover:text-foreground"
                        >
                            <Mail className="size-3.5 shrink-0" aria-hidden="true" />
                            <span className="truncate">{employee.email}</span>
                        </a>
                        {phone && (
                            <a
                                href={`tel:${phone}`}
                                className="inline-flex items-center gap-1.5 hover:text-foreground"
                            >
                                <Phone className="size-3.5" aria-hidden="true" />
                                {phone}
                            </a>
                        )}
                        {work.length > 0 && (
                            <span className="inline-flex items-center gap-1.5">
                                <Briefcase className="size-3.5" aria-hidden="true" />
                                {work.join(" · ")}
                            </span>
                        )}
                    </div>
                </div>

                {access.canManage && <EmployeeHeroActions employee={employee} />}
            </div>
        </section>
    );
}
