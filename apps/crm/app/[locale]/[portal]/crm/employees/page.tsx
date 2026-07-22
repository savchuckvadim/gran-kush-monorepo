"use client";

import { useState } from "react";

import { Loader2, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";

import type { SchemaEmployeeListItemDto } from "@workspace/api-client/core";
import { Button, Card } from "@workspace/ui";

import { RegisterEmployeeForm } from "@/modules/features";
import {
    useDeactivateEmployee,
    useEmployees,
    useUpdateEmployee,
} from "@/modules/entities/employee";
import { useAuth } from "@/modules/processes/auth/provider/AuthProvider";

// ─── Role badge ──────────────────────────────────────────────────────────────

const ROLE_STYLES: Record<string, string> = {
    portal_owner: "bg-purple-500/10 text-purple-700",
    admin: "bg-blue-500/10 text-blue-700",
    manager: "bg-sky-500/10 text-sky-700",
};

function RoleBadge({ role }: { role: string }) {
    const cls = ROLE_STYLES[role] ?? "bg-muted text-muted-foreground";
    return (
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{role}</span>
    );
}

function fieldValue(employee: SchemaEmployeeListItemDto, key: string): string {
    const field = employee.fields.find((item) => item.fieldKey === key);
    const value = field?.value as unknown;
    return value == null || value === "" ? "" : String(value);
}

// ─── Single row ───────────────────────────────────────────────────────────────

function EmployeeRow({
    employee,
    currentUserId,
    isAdmin,
}: {
    employee: SchemaEmployeeListItemDto;
    currentUserId: string | undefined;
    isAdmin: boolean;
}) {
    const updateMutation = useUpdateEmployee();
    const deactivateMutation = useDeactivateEmployee();

    const firstName = fieldValue(employee, "first_name");
    const lastName = fieldValue(employee, "last_name");
    const displayName = `${firstName} ${lastName}`.trim() || employee.email;

    const isSelf = employee.userId === currentUserId;
    const isOwner = employee.role === "portal_owner";
    const canModify = isAdmin && !isSelf && !isOwner;

    function handleDeactivate() {
        if (!confirm(`Деактивировать сотрудника ${displayName}?`)) return;
        deactivateMutation.mutate(employee.id, {
            onSuccess: () => toast.success("Сотрудник деактивирован"),
            onError: (e) => toast.error(e.message),
        });
    }

    function handleRoleChange(e: React.ChangeEvent<HTMLSelectElement>) {
        const role = e.target.value;
        updateMutation.mutate(
            { id: employee.id, data: { role } },
            {
                onSuccess: () => toast.success("Роль обновлена"),
                onError: (err) => toast.error(err.message),
            }
        );
    }

    const isPending = updateMutation.isPending || deactivateMutation.isPending;

    return (
        <tr className="border-b text-sm last:border-b-0">
            <td className="px-3 py-2 font-medium">
                {displayName}
                {isSelf && (
                    <span className="ml-2 text-xs text-muted-foreground">(вы)</span>
                )}
            </td>
            <td className="px-3 py-2 text-muted-foreground">{employee.email}</td>
            <td className="px-3 py-2">
                {canModify ? (
                    <select
                        defaultValue={employee.role}
                        onChange={handleRoleChange}
                        disabled={isPending}
                        className="rounded border bg-background px-1.5 py-0.5 text-xs"
                    >
                        <option value="manager">manager</option>
                        <option value="admin">admin</option>
                    </select>
                ) : (
                    <RoleBadge role={employee.role} />
                )}
            </td>
            <td className="px-3 py-2 text-xs text-muted-foreground">
                {fieldValue(employee, "position") || "—"}
            </td>
            <td className="px-3 py-2 text-xs text-muted-foreground">
                {fieldValue(employee, "department") || "—"}
            </td>
            <td className="px-3 py-2">
                {employee.isActive ? (
                    <span className="flex items-center gap-1 text-xs text-green-700">
                        <UserCheck className="h-3 w-3" /> Активен
                    </span>
                ) : (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <UserX className="h-3 w-3" /> Неактивен
                    </span>
                )}
            </td>
            <td className="px-3 py-2">
                {canModify && employee.isActive && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive hover:text-destructive"
                        onClick={handleDeactivate}
                        disabled={isPending}
                    >
                        {deactivateMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                            "Деактивировать"
                        )}
                    </Button>
                )}
            </td>
        </tr>
    );
}

// ─── Table ────────────────────────────────────────────────────────────────────

function EmployeesTable() {
    const [page, setPage] = useState(1);
    const { data, isLoading, error } = useEmployees({ page, limit: 20 });
    const { currentUser } = useAuth();

    const isAdmin = (currentUser?.employments ?? []).some(
        (employment) =>
            employment.isActive &&
            (employment.role === "admin" || employment.role === "portal_owner")
    );
    const employees = data?.items ?? [];
    const totalPages = data?.totalPages ?? 1;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error) {
        return (
            <p className="py-8 text-center text-sm text-destructive">
                Не удалось загрузить сотрудников
            </p>
        );
    }

    if (employees.length === 0) {
        return (
            <p className="py-8 text-center text-sm text-muted-foreground">
                Сотрудников не найдено
            </p>
        );
    }

    return (
        <div className="space-y-3">
            <div className="overflow-x-auto rounded border">
                <table className="w-full">
                    <thead>
                        <tr className="border-b bg-muted/40 text-left text-xs font-medium text-muted-foreground">
                            <th className="px-3 py-2">Имя</th>
                            <th className="px-3 py-2">Email</th>
                            <th className="px-3 py-2">Роль</th>
                            <th className="px-3 py-2">Должность</th>
                            <th className="px-3 py-2">Отдел</th>
                            <th className="px-3 py-2">Статус</th>
                            <th className="px-3 py-2" />
                        </tr>
                    </thead>
                    <tbody>
                        {employees.map((emp) => (
                            <EmployeeRow
                                key={emp.id}
                                employee={emp}
                                currentUserId={currentUser?.id}
                                isAdmin={isAdmin}
                            />
                        ))}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-end gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                    >
                        ←
                    </Button>
                    <span className="text-xs text-muted-foreground">
                        {page} / {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                    >
                        →
                    </Button>
                </div>
            )}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CrmEmployeesPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">Сотрудники</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Список сотрудников портала. Администраторы могут менять роли и деактивировать аккаунты.
                </p>
            </div>

            <Card className="p-0">
                <EmployeesTable />
            </Card>

            <Card className="p-6">
                <h2 className="mb-4 text-lg font-semibold">Добавить сотрудника</h2>
                <RegisterEmployeeForm />
            </Card>
        </div>
    );
}
