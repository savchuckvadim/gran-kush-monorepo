"use client";

import { Badge, type BadgeProps } from "@workspace/ui";

import { type EmployeeRoleRef, OWNER_ROLE_KEY } from "../api";
import { useRoleLabel } from "../hooks";

const ADMIN_ROLE_KEY = "admin";

/** Чем шире права, тем заметнее бейдж: владелец и администратор видны в списке сразу. */
const variantOf = (role: EmployeeRoleRef): BadgeProps["variant"] => {
    if (role.isSystem && role.key === OWNER_ROLE_KEY) return "default";
    if (role.isSystem && role.key === ADMIN_ROLE_KEY) return "secondary";
    return "outline";
};

export function RoleBadge({ role }: { role: EmployeeRoleRef }) {
    const label = useRoleLabel();
    return <Badge variant={variantOf(role)}>{label(role)}</Badge>;
}
