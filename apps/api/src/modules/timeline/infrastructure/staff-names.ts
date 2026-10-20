import type { Prisma } from "@prisma/client";

import {
    buildMemberFieldMap,
    getMemberDisplayNameParts,
} from "@modules/portal/crm/entity-fields/lib/member-field-values";
import { PROFILE_NAME_FIELD_VALUES } from "@modules/portal/crm/entity-fields/lib/profile-name.select";

/** Что нужно, чтобы назвать сотрудника: имя из профиля, без имени — начало email. */
export const STAFF_NAME_SELECT = {
    id: true,
    user: { select: { email: true } },
    profile: { select: { fieldValues: PROFILE_NAME_FIELD_VALUES } },
} as const;

export type StaffNameRow = Prisma.EmployeeGetPayload<{ select: typeof STAFF_NAME_SELECT }>;

export const staffName = (row: StaffNameRow): string => {
    const fields = buildMemberFieldMap(
        (row.profile?.fieldValues ?? []).map((value) => ({
            valueJson: value.valueJson,
            fieldDefinition: value.fieldDefinition,
        }))
    );
    const { firstName, lastName } = getMemberDisplayNameParts(fields);
    const full = [firstName, lastName].filter(Boolean).join(" ").trim();
    return full || row.user.email.split("@")[0] || row.id;
};
