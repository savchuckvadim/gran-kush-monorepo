"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    deactivateEmployee,
    getEmployees,
    type EmployeeFilters,
    type UpdateEmployeePayload,
    updateEmployee,
} from "../api/employee.api";

const EMPLOYEE_KEYS = {
    all: ["employees"] as const,
    list: (filters?: EmployeeFilters) => [...EMPLOYEE_KEYS.all, "list", filters] as const,
};

export function useEmployees(filters?: EmployeeFilters) {
    return useQuery({
        queryKey: EMPLOYEE_KEYS.list(filters),
        queryFn: () => getEmployees(filters),
    });
}

export function useUpdateEmployee() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateEmployeePayload }) =>
            updateEmployee(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: EMPLOYEE_KEYS.all });
        },
    });
}

export function useDeactivateEmployee() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deactivateEmployee(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: EMPLOYEE_KEYS.all });
        },
    });
}
