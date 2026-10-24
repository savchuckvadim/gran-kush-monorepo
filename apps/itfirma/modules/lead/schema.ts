import { z } from "zod";

import { LOCALES } from "@/modules/shared/config/locales";

export const LEAD_SERVICES = [
    "web",
    "apps",
    "mobile",
    "bitrix",
    "integrations",
    "ai",
    "training",
    "devops",
    "other",
] as const;

export const LEAD_BUDGETS = ["unknown", "lt3k", "3k-10k", "10k-30k", "gt30k"] as const;

export const LEAD_LIMITS = {
    name: 80,
    contact: 160,
    message: 3000,
} as const;

/**
 * One request from the contact form. `website` is the honeypot: a human never sees the field,
 * so any value means a bot and the request is dropped silently.
 */
export const leadSchema = z.object({
    name: z.string().trim().min(2).max(LEAD_LIMITS.name),
    email: z.string().trim().email().max(LEAD_LIMITS.contact),
    phone: z.string().trim().max(LEAD_LIMITS.contact).optional().or(z.literal("")),
    service: z.enum(LEAD_SERVICES),
    budget: z.enum(LEAD_BUDGETS),
    message: z.string().trim().min(10).max(LEAD_LIMITS.message),
    consent: z.literal(true),
    locale: z.enum(LOCALES),
    website: z.string().max(LEAD_LIMITS.contact).optional(),
});

export type LeadInput = z.infer<typeof leadSchema>;
