import type { Prisma } from "@prisma/client";

import { buildMemberFieldMap, getMemberDisplayNameParts } from "./member-field-values";
import { PROFILE_NAME_FIELD_VALUES } from "./profile-name.select";

/** Что нужно, чтобы назвать сотрудника или участника: имя из профиля, без имени — начало email. */
export const PERSON_NAME_SELECT = {
    id: true,
    user: { select: { email: true } },
    profile: { select: { fieldValues: PROFILE_NAME_FIELD_VALUES } },
} as const;

export type PersonNameRow = Prisma.EmployeeGetPayload<{ select: typeof PERSON_NAME_SELECT }>;

export const personName = (row: PersonNameRow): string => {
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
