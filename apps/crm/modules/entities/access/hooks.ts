"use client";

import { useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    getApiErrorCode,
    type SchemaCreatePortalRoleDto,
    type SchemaUpdatePortalRoleDto,
} from "@workspace/api-client/core";

import { authKeys } from "@/modules/entities/auth";
import { usePortalInfo } from "@/modules/entities/portal";
import { useAuth } from "@/modules/processes";

import {
    createPortalRole,
    deletePortalRole,
    type EmployeeRoleRef,
    getPortalRoles,
    type Permission,
    type PortalRole,
    updatePortalRole,
} from "./api";
import { rolesKey } from "./keys";

export interface PermissionsState {
    /** Роль в открытом клубе; пока «me» или клуб грузятся — undefined */
    role: EmployeeRoleRef | undefined;
    permissions: ReadonlySet<Permission>;
    /** Есть ли все перечисленные права. API проверяет их ещё раз на каждом запросе */
    can: (...required: Permission[]) => boolean;
    /** Сотрудник в открытом клубе: автор своих комментариев и действий */
    employeeId: string | undefined;
}

/** Права сотрудника в открытом клубе — из «me» (`employments[].permissions`). */
export function usePermissions(): PermissionsState {
    const { currentUser } = useAuth();
    const { data: info } = usePortalInfo();
    const employment = currentUser?.employments.find((item) => item.portalId === info?.portalId);

    const permissions = useMemo(
        () => new Set<Permission>(employment?.permissions ?? []),
        [employment?.permissions]
    );
    const can = useCallback(
        (...required: Permission[]) => required.every((code) => permissions.has(code)),
        [permissions]
    );

    return { role: employment?.role, permissions, can, employeeId: employment?.employeeId };
}

/** Название роли: у системной — перевод по ключу, у своей — имя, которое дал клуб. */
export function useRoleLabel(): (
    role: Pick<EmployeeRoleRef, "key" | "name" | "isSystem">
) => string {
    const t = useTranslations("crm.access.roles");
    return useCallback((role) => (role.isSystem ? t(role.key) : (role.name ?? role.key)), [t]);
}

const ROLE_ERROR_CODES = ["exceeds_own_permissions", "role_in_use", "role_not_editable"] as const;
type RoleErrorCode = (typeof ROLE_ERROR_CODES)[number];
const isRoleErrorCode = (code: string | undefined): code is RoleErrorCode =>
    ROLE_ERROR_CODES.some((known) => known === code);

/** Текст ошибки сохранения роли: по машинному коду API, иначе общий. */
export function useRoleErrorText(): (error: unknown) => string {
    const t = useTranslations("crm.access.rolesPage.errors");
    return useCallback(
        (error) => {
            const code = getApiErrorCode(error);
            return isRoleErrorCode(code) ? t(code) : t("generic");
        },
        [t]
    );
}

export function usePortalRoles(enabled = true) {
    return useQuery({ queryKey: rolesKey, queryFn: getPortalRoles, enabled });
}

/**
 * Роли, которые действующий может выдать: кроме владельца и не шире его собственных прав —
 * то же правило «не шире своих прав», что у API.
 */
export function useAssignableRoles(): PortalRole[] {
    const { permissions } = usePermissions();
    const { data } = usePortalRoles();
    return useMemo(
        () =>
            (data?.roles ?? []).filter(
                (role) =>
                    role.isAssignable && role.permissions.every((code) => permissions.has(code))
            ),
        [data?.roles, permissions]
    );
}

/** После изменения ролей перечитываем и «me»: права самого сотрудника могли поменяться. */
function useInvalidateRoles() {
    const queryClient = useQueryClient();
    return () =>
        Promise.all([
            queryClient.invalidateQueries({ queryKey: rolesKey }),
            queryClient.invalidateQueries({ queryKey: authKeys.current() }),
        ]);
}

export function useCreatePortalRole() {
    const invalidate = useInvalidateRoles();
    return useMutation({
        mutationFn: (body: SchemaCreatePortalRoleDto) => createPortalRole(body),
        onSuccess: invalidate,
    });
}

export function useUpdatePortalRole() {
    const invalidate = useInvalidateRoles();
    return useMutation({
        mutationFn: ({ id, body }: { id: string; body: SchemaUpdatePortalRoleDto }) =>
            updatePortalRole(id, body),
        onSuccess: invalidate,
    });
}

export function useDeletePortalRole() {
    const invalidate = useInvalidateRoles();
    return useMutation({
        mutationFn: (id: string) => deletePortalRole(id),
        onSuccess: invalidate,
    });
}
