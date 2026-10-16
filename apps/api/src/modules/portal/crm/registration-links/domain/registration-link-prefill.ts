import { Prisma } from "@prisma/client";

import { RegistrationLinkPrefillDto } from "../api/dto/registration-link.dto";

/**
 * Only the two prefill keys survive — the email and non-empty form fields; nothing else from a
 * request body reaches the stored JSON or the public page. The email is kept trimmed and lowercase:
 * a personal link is compared with the account address by it.
 */
export const normalizeLinkPrefill = (
    raw: RegistrationLinkPrefillDto | Prisma.JsonValue | null | undefined
): RegistrationLinkPrefillDto | null => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const source = raw as { email?: unknown; fields?: unknown };
    const prefill: RegistrationLinkPrefillDto = {};
    if (typeof source.email === "string" && source.email.trim()) {
        prefill.email = source.email.trim().toLowerCase();
    }
    if (source.fields && typeof source.fields === "object" && !Array.isArray(source.fields)) {
        const fields = Object.fromEntries(
            Object.entries(source.fields as Record<string, unknown>).filter(
                ([, value]) => value !== undefined && value !== null && value !== ""
            )
        );
        if (Object.keys(fields).length > 0) prefill.fields = fields;
    }
    return prefill.email || prefill.fields ? prefill : null;
};
