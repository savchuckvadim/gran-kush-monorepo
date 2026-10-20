import type { CounterpartyKind } from "@prisma/client";

import { classifySpanishTaxId, normalizeTaxId } from "../organization/spanish-tax-id";
import { comparableText } from "../text";

import { normalizeDocumentNumber } from "./ledger-entry";

/** Что о контрагенте шифруется: имя, налоговый номер, страна, заметки. */
export interface CounterpartyDetails {
    name: string;
    nif: string | null;
    /** ISO 3166-1 alpha-2; пусто — Испания */
    country: string | null;
    notes: string | null;
}

/** Контрагент: у участника клуба `details` пусто — имя берётся из карточки участника. */
export interface Counterparty {
    id: string;
    kind: CounterpartyKind;
    memberId: string | null;
    details: CounterpartyDetails | null;
    archivedAt: Date | null;
    createdAt: Date;
}

export const HOME_COUNTRY = "ES";

/**
 * Префиксы НДС стран ЕС (VIES): номер `DE123456789` — немецкий поставщик. Испанский CIF, NIF и
 * NIE так не начинаются, поэтому префикс однозначен. `EL` — Греция, `XI` — Северная Ирландия.
 */
const EU_VAT_PREFIXES =
    "AT BE BG CY CZ DE DK EE EL FI FR HR HU IE IT LT LU LV MT NL PL PT RO SE SI SK XI".split(" ");

const TAX_ID_SHAPE = /^[A-Z0-9]{2,20}$/;

export interface ParsedTaxId {
    value: string;
    country: string;
}

/**
 * Налоговый номер контрагента: испанский проверяется по контрольному знаку (`ESB12345678` —
 * тот же `B12345678`), номер с префиксом страны ЕС принимается как иностранный. `country` из
 * формы важнее префикса. `null` — номер с ошибкой.
 */
export const parseTaxId = (raw: string, country: string | null = null): ParsedTaxId | null => {
    let value = normalizeTaxId(raw);
    let resolved = country?.toUpperCase() ?? null;
    if (!resolved) {
        const prefix = value.slice(0, 2);
        resolved = EU_VAT_PREFIXES.includes(prefix) ? prefix : HOME_COUNTRY;
    }
    if (resolved === HOME_COUNTRY && value.startsWith(HOME_COUNTRY) && value.length === 11) {
        value = value.slice(2);
    }
    if (!TAX_ID_SHAPE.test(value)) return null;
    if (resolved === HOME_COUNTRY && !classifySpanishTaxId(value)) return null;
    return { value, country: resolved };
};

/** Значения для слепых индексов: по ним ищутся дубли, не храня номер и имя открыто. */
export const blindIndexInputs = {
    nif: (nif: string) => `nif:${normalizeTaxId(nif)}`,
    name: (name: string) => `name:${comparableText(name)}`,
    document: (number: string) => `doc:${normalizeDocumentNumber(number)}`,
};

export const COUNTERPARTY_ERRORS = {
    nameRequired: "counterparty_name_required",
    nifInvalid: "counterparty_nif_invalid",
    nifTaken: "counterparty_nif_taken",
    memberManaged: "counterparty_is_member",
} as const;
