"use client";

import { EmployeeCard } from "@/modules/widgets/employee";

/** Своя страница сотрудника — та же карточка, что в слайдере, и ссылка назад к списку. */
export function EmployeePage({ employeeId }: { employeeId: string }) {
    return <EmployeeCard employeeId={employeeId} layout="page" />;
}
