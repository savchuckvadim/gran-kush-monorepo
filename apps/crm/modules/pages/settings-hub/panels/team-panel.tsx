"use client";

import { usePermissions } from "@/modules/entities/access";

import { SettingsTileGrid } from "../settings-tile";

import { EmployeesTile } from "./employees-tile";
import { InvitationsTile } from "./invitations-tile";
import { RolesTile } from "./roles-tile";

/** Команда: сотрудники, приглашения и роли — каждая плитка только с правом на свой раздел. */
export function TeamPanel() {
    const { can } = usePermissions();

    return (
        <SettingsTileGrid>
            {can("employees.read") && <EmployeesTile />}
            {can("employees.manage") && <InvitationsTile />}
            {(can("roles.manage") || can("employees.read")) && <RolesTile />}
        </SettingsTileGrid>
    );
}
