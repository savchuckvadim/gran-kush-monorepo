"use client";

import type { Employee } from "@/modules/entities/employee";

import { EmployeeAccessButton } from "./EmployeeAccessButton";
import { EmployeeRoleSelect } from "./EmployeeRoleSelect";

/** Действия администратора: роль и доступ к CRM клуба. */
export function EmployeeHeroActions({ employee }: { employee: Employee }) {
    return (
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            <EmployeeRoleSelect employee={employee} />
            <EmployeeAccessButton employee={employee} />
        </div>
    );
}
