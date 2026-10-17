"use client";

import type { Employee } from "@/modules/entities/employee";

import { useEmployeeAccess } from "../hooks/use-employee-access";
import type { EmployeeCardLayout } from "../model/employee-card.types";

import { EmployeeBackLink } from "./EmployeeBackLink";
import { EmployeeHero } from "./EmployeeHero";
import { EmployeeProfilePanel } from "./EmployeeProfilePanel";

interface EmployeeCardContentProps {
    employee: Employee;
    layout: EmployeeCardLayout;
}

export function EmployeeCardContent({ employee, layout }: EmployeeCardContentProps) {
    const access = useEmployeeAccess(employee);

    return (
        <div data-slot="employee-card" data-layout={layout} className="flex flex-col gap-4">
            {layout === "page" && <EmployeeBackLink />}
            <EmployeeHero employee={employee} access={access} />
            <EmployeeProfilePanel employee={employee} />
        </div>
    );
}
