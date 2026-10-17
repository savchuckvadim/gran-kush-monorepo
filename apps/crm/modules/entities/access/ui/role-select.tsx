"use client";

import { FieldSelect, type FieldSelectProps } from "@workspace/ui";

import { useAssignableRoles, useRoleLabel } from "../hooks";

type RoleSelectProps = Omit<FieldSelectProps, "options" | "value" | "onValueChange"> & {
    /** Ключ роли клуба */
    value: string;
    onValueChange: (roleKey: string) => void;
};

/**
 * Выбор роли сотрудника: роли клуба, которые действующий может выдать, — кроме владельца и не шире
 * его собственных прав (то же правило проверяет API).
 */
export function RoleSelect({ value, onValueChange, ...props }: RoleSelectProps) {
    const roles = useAssignableRoles();
    const label = useRoleLabel();

    return (
        <FieldSelect
            {...props}
            options={roles.map((role) => ({ value: role.key, label: label(role) }))}
            value={value}
            onValueChange={onValueChange}
        />
    );
}
