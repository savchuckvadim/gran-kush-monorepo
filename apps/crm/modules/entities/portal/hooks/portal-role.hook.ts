"use client";

import type { SchemaEmployeeEmploymentDto } from "@workspace/api-client/core";

import { useAuth } from "@/modules/processes";

import { usePortalInfo } from "./portal-info.hook";

export type PortalRole = SchemaEmployeeEmploymentDto["role"];

/** Same lists as the API guards: AdminGuard and RequireManager. */
const ADMIN_ROLES: ReadonlySet<PortalRole> = new Set(["portal_owner", "admin"]);
const MANAGER_ROLES: ReadonlySet<PortalRole> = new Set(["portal_owner", "admin", "manager"]);

export interface PortalRoleState {
    role: PortalRole | undefined;
    /** Owner or admin: settings, registration links, billing */
    isAdmin: boolean;
    /** Manager and up: order stages and payments */
    isManager: boolean;
}

/** The signed-in employee's role in the open portal. The API checks it again on every call. */
export function usePortalRole(): PortalRoleState {
    const { currentUser } = useAuth();
    const { data: info } = usePortalInfo();
    const role = currentUser?.employments.find(
        (employment) => employment.portalId === info?.portalId
    )?.role;

    return {
        role,
        isAdmin: role !== undefined && ADMIN_ROLES.has(role),
        isManager: role !== undefined && MANAGER_ROLES.has(role),
    };
}
