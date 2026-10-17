"use client";

import { ApiClientError } from "@workspace/api-client/core";

import { useEmployee } from "@/modules/entities/employee";

import type { EmployeeCardProps } from "../model/employee-card.types";

import { EmployeeCardContent } from "./EmployeeCardContent";
import { EmployeeCardSkeleton } from "./EmployeeCardSkeleton";
import { EmployeeCardState } from "./EmployeeCardState";

const NOT_FOUND_STATUS = 404;

/** Карточка сотрудника: на своей странице и в слайдере поверх другой страницы. */
export function EmployeeCard({ employeeId, layout = "page" }: EmployeeCardProps) {
    const { data: employee, isLoading, error, refetch } = useEmployee(employeeId);

    if (isLoading) return <EmployeeCardSkeleton />;
    if (error instanceof ApiClientError && error.status === NOT_FOUND_STATUS) {
        return <EmployeeCardState kind="not-found" />;
    }
    if (error) return <EmployeeCardState kind="error" onRetry={() => void refetch()} />;
    if (!employee) return <EmployeeCardState kind="not-found" />;
    return <EmployeeCardContent employee={employee} layout={layout} />;
}
