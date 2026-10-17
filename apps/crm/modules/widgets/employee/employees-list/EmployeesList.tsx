"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { InitialsAvatar } from "@workspace/ui";

import {
    type Employee,
    EMPLOYEE_FIELD,
    employeeFieldText,
    employeeName,
    EmployeeRoleBadge,
    EmployeeStatusBadge,
    useEmployees,
} from "@/modules/entities/employee";
import { useAuth } from "@/modules/processes";
import { useOpenEntity } from "@/modules/shared/lib/entity-slider";
import { EntityLink } from "@/modules/shared/ui/EntityLink";
import { EntityList, type EntityListTableColumn } from "@/modules/shared/ui/EntityList";

const PAGE_SIZE = 20;
const EMPTY_CELL = "—";

/**
 * Сотрудники клуба. Строка и карточка открывают сотрудника в слайдере (на узком экране — его
 * страницу), как участника; роль и доступ меняются там, а не в таблице.
 */
export function EmployeesList() {
    const t = useTranslations("crm.employees");
    const openEntity = useOpenEntity();
    const { currentUser } = useAuth();
    const [page, setPage] = useState(1);
    const { data, isPending, error } = useEmployees({ page, limit: PAGE_SIZE });

    const open = (employee: Employee) => openEntity({ kind: "employee", id: employee.id });
    const text = (employee: Employee, fieldKey: string) =>
        employeeFieldText(employee, fieldKey) ?? EMPTY_CELL;

    const columns: EntityListTableColumn<Employee>[] = [
        {
            key: "name",
            header: t("columns.name"),
            cell: (employee) => (
                <span className="inline-flex flex-wrap items-baseline gap-x-2">
                    <EntityLink
                        kind="employee"
                        id={employee.id}
                        className="font-medium hover:underline"
                        // ссылка сама открывает карточку: строка не должна открыть её второй раз
                        onClick={(event) => event.stopPropagation()}
                    >
                        {employeeName(employee)}
                    </EntityLink>
                    {employee.userId === currentUser?.id ? (
                        <span className="text-xs text-muted-foreground">{t("you")}</span>
                    ) : null}
                </span>
            ),
        },
        { key: "email", header: t("columns.email"), cell: (employee) => employee.email },
        {
            key: "role",
            header: t("columns.role"),
            cell: (employee) => <EmployeeRoleBadge role={employee.role} />,
        },
        {
            key: "position",
            header: t("columns.position"),
            cell: (employee) => text(employee, EMPLOYEE_FIELD.position),
        },
        {
            key: "department",
            header: t("columns.department"),
            cell: (employee) => text(employee, EMPLOYEE_FIELD.department),
        },
        {
            key: "status",
            header: t("columns.status"),
            cell: (employee) => <EmployeeStatusBadge isActive={employee.isActive} />,
        },
    ];

    return (
        <EntityList<Employee>
            items={data?.items ?? []}
            loading={isPending}
            error={error ? t("loadError") : undefined}
            emptyState={
                <p className="py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
            }
            getRowKey={(employee) => employee.id}
            tableColumns={columns}
            defaultViewMode="table"
            viewModeStorageKey="crm-employees"
            visibilityStorageKey="crm-employees"
            reserveFilterSpace={false}
            isRowClickable
            onRowClick={open}
            cardTitle={employeeName}
            cardAvatar={(employee) => (
                <InitialsAvatar
                    colorful
                    name={employeeName(employee)}
                    className="size-16 text-xl"
                />
            )}
            defaultVisibleCardFieldKeys={["role", "position", "status"]}
            isCardClickable
            onCardClick={open}
            pagination={{
                page,
                totalPages: data?.totalPages ?? 1,
                totalCount: data?.total,
                onPageChange: setPage,
            }}
        />
    );
}
