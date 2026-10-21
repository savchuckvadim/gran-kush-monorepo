import { BadRequestException } from "@nestjs/common";

import { PortalFieldType, Prisma } from "@prisma/client";

import {
    ALLOWED_URL_PROTOCOLS,
    DYNAMIC_FIELD_LIMITS,
} from "@modules/portal/crm/entity-fields/constants/dynamic-field-limits";

/** Что о поле нужно правилам: опции выбора, множественность и правила из настроек поля. */
export interface DynamicFieldRules {
    options: { valueKey: string }[];
    isMultiple: boolean;
    validationJson: Prisma.JsonValue | null;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[1-9]\d{1,14}$/;

const ruleNumber = (rules: Prisma.JsonValue | null, name: string): number | undefined => {
    if (typeof rules !== "object" || rules === null || Array.isArray(rules)) return undefined;
    const value = rules[name];
    return typeof value === "number" ? value : undefined;
};

const boundedString = (key: string, raw: unknown, maxLength: number): string => {
    if (typeof raw !== "string") {
        throw new BadRequestException(`Field "${key}" must be a string`);
    }
    if (raw.length > maxLength) {
        throw new BadRequestException(`Field "${key}" is too long`);
    }
    return raw;
};

const textWithRules = (
    key: string,
    raw: unknown,
    rules: Prisma.JsonValue | null,
    ceiling: number
): string => {
    const max = Math.min(ruleNumber(rules, "maxLength") ?? ceiling, ceiling);
    const value = boundedString(key, raw, max);
    const min = ruleNumber(rules, "minLength");
    if (min !== undefined && value.length < min) {
        throw new BadRequestException(`Field "${key}" is too short`);
    }
    return value;
};

/** Маркер «файл с аккаунта»: ровно `{ fromAccount: boolean }`, другие ключи не сохраняются. */
const isAccountReference = (raw: unknown): raw is { fromAccount: boolean } => {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return false;
    const keys = Object.keys(raw);
    return (
        keys.length === 1 &&
        keys[0] === "fromAccount" &&
        typeof (raw as { fromAccount: unknown }).fromAccount === "boolean"
    );
};

const optionValue = (key: string, raw: unknown, allowed: Set<string>): string => {
    const value = boundedString(key, raw, DYNAMIC_FIELD_LIMITS.stringMaxLength);
    if (allowed.size > 0 && !allowed.has(value)) {
        throw new BadRequestException(`Invalid option for "${key}"`);
    }
    return value;
};

const webUrl = (key: string, raw: unknown): string => {
    const value = boundedString(key, raw, DYNAMIC_FIELD_LIMITS.urlMaxLength);
    let protocol: string;
    try {
        protocol = new URL(value).protocol;
    } catch {
        throw new BadRequestException(`Field "${key}" must be a valid URL`);
    }
    if (!ALLOWED_URL_PROTOCOLS.has(protocol)) {
        throw new BadRequestException(`Field "${key}" must be an http(s) URL`);
    }
    return value;
};

/**
 * Значение динамического поля → то, что пишется в `FieldValue`. Общие правила для всех писателей
 * (анкета, форма сотрудника, записи сущностей): тип, потолки длины и числа элементов
 * (`DYNAMIC_FIELD_LIMITS`), опции выбора, только http(s) в `url`. Неверное значение — 400.
 */
export const coerceDynamicFieldValue = (
    key: string,
    type: PortalFieldType,
    raw: unknown,
    field: DynamicFieldRules
): unknown => {
    const rules = field.validationJson;

    switch (type) {
        case PortalFieldType.document:
        case PortalFieldType.signature: {
            // Файлы живут на аккаунте (UserDocument/UserSignature); в FieldValue — маркер или ссылка
            if (typeof raw === "boolean") {
                return { fromAccount: raw };
            }
            if (isAccountReference(raw)) {
                return { fromAccount: raw.fromAccount };
            }
            if (typeof raw !== "string") {
                throw new BadRequestException(
                    `Field "${key}" must be a string or account reference object`
                );
            }
            return boundedString(key, raw, DYNAMIC_FIELD_LIMITS.stringMaxLength);
        }
        case PortalFieldType.string:
        case PortalFieldType.file:
            return textWithRules(key, raw, rules, DYNAMIC_FIELD_LIMITS.stringMaxLength);
        case PortalFieldType.text:
            return textWithRules(key, raw, rules, DYNAMIC_FIELD_LIMITS.textMaxLength);
        case PortalFieldType.email: {
            const email = boundedString(key, raw, DYNAMIC_FIELD_LIMITS.emailMaxLength)
                .trim()
                .toLowerCase();
            if (!EMAIL_PATTERN.test(email)) {
                throw new BadRequestException(`Field "${key}" must be a valid email`);
            }
            return email;
        }
        case PortalFieldType.phone: {
            if (typeof raw !== "string" || !PHONE_PATTERN.test(raw)) {
                throw new BadRequestException(`Field "${key}" must be a valid phone`);
            }
            return raw;
        }
        case PortalFieldType.int: {
            const n = typeof raw === "number" ? raw : Number(raw);
            if (!Number.isSafeInteger(n)) {
                throw new BadRequestException(`Field "${key}" must be an integer`);
            }
            return n;
        }
        case PortalFieldType.decimal: {
            const n = typeof raw === "number" ? raw : Number(raw);
            if (!Number.isFinite(n)) {
                throw new BadRequestException(`Field "${key}" must be a number`);
            }
            return n;
        }
        case PortalFieldType.boolean: {
            if (typeof raw !== "boolean") {
                throw new BadRequestException(`Field "${key}" must be a boolean`);
            }
            return raw;
        }
        case PortalFieldType.date:
        case PortalFieldType.datetime: {
            const value = boundedString(key, raw, DYNAMIC_FIELD_LIMITS.dateMaxLength);
            if (Number.isNaN(new Date(value).getTime())) {
                throw new BadRequestException(`Field "${key}" must be a valid date`);
            }
            return value;
        }
        case PortalFieldType.single_select:
        case PortalFieldType.relation:
            return optionValue(key, raw, new Set(field.options.map((o) => o.valueKey)));
        case PortalFieldType.multi_select: {
            if (!Array.isArray(raw)) {
                throw new BadRequestException(`Field "${key}" must be an array of strings`);
            }
            if (raw.length > DYNAMIC_FIELD_LIMITS.multipleMaxItems) {
                throw new BadRequestException(`Field "${key}" has too many values`);
            }
            const allowed = new Set(field.options.map((o) => o.valueKey));
            return raw.map((item) => optionValue(key, item, allowed));
        }
        case PortalFieldType.url:
            return webUrl(key, raw);
        default:
            throw new BadRequestException(`Field "${key}" has an unsupported type`);
    }
};
