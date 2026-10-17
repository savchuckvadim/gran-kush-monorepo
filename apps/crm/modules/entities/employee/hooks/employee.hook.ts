"use client";

import { type QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiClientError } from "@workspace/api-client/core";

import {
    createEmployee,
    type CreateEmployeePayload,
    deactivateEmployee,
    type Employee,
    type EmployeeFilters,
    getEmployee,
    getEmployees,
    updateEmployee,
    type UpdateEmployeePayload,
} from "../api/employee.api";
import { employeeKeys } from "../model/employee-keys";

/** Ответ API — уже новая карточка: кладём её в кэш сразу, списки перечитываются. */
const applyEmployee = (queryClient: QueryClient, employee: Employee) => {
    queryClient.setQueryData(employeeKeys.detail(employee.id), employee);
    void queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
};

export function useEmployees(filters?: EmployeeFilters) {
    return useQuery({
        queryKey: employeeKeys.list(filters),
        queryFn: () => getEmployees(filters),
    });
}

/** Retries on a network failure, not on a 404: a deleted or foreign employee will not appear. */
const MAX_RETRIES = 3;
const retryUnlessMissing = (failureCount: number, error: Error): boolean =>
    !(error instanceof ApiClientError && error.status === 404) && failureCount < MAX_RETRIES;

export function useEmployee(id: string) {
    return useQuery({
        queryKey: employeeKeys.detail(id),
        queryFn: () => getEmployee(id),
        enabled: !!id,
        retry: retryUnlessMissing,
    });
}

export function useCreateEmployee() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (body: CreateEmployeePayload) => createEmployee(body),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: employeeKeys.lists() }),
    });
}

export function useUpdateEmployee() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateEmployeePayload }) =>
            updateEmployee(id, data),
        onSuccess: (employee) => applyEmployee(queryClient, employee),
    });
}

export function useDeactivateEmployee() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deactivateEmployee(id),
        onSuccess: (employee) => applyEmployee(queryClient, employee),
    });
}
