import { z } from "zod";

import type { Counterparty, CounterpartyInput } from "@/modules/entities/finance";

/** Сообщения — ключи `crm.finance.counterparties.errors.*`. */
export const counterpartyFormSchema = z.object({
    kind: z.enum(["supplier", "customer", "authority", "employee"]),
    name: z.string().trim().min(1, "required").max(160, "tooLong"),
    nif: z.string().trim().max(24, "tooLong"),
    country: z
        .string()
        .trim()
        .refine((value) => value === "" || /^[A-Za-z]{2}$/.test(value), "country"),
    notes: z.string().max(2000, "tooLong"),
});

export type CounterpartyFormValues = z.infer<typeof counterpartyFormSchema>;

export const counterpartyFormValues = (party?: Counterparty): CounterpartyFormValues => ({
    kind: party && party.kind !== "member" ? party.kind : "supplier",
    name: party?.name ?? "",
    nif: party?.nif ?? "",
    country: party?.country ?? "",
    notes: party?.notes ?? "",
});

export const toCounterpartyInput = (values: CounterpartyFormValues): CounterpartyInput => ({
    kind: values.kind,
    name: values.name.trim(),
    nif: values.nif.trim() || null,
    country: values.country.trim().toUpperCase() || null,
    notes: values.notes.trim() || null,
});
