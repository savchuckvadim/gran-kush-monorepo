import type { Field, GroupField, TextareaField, TextField } from "payload";

import { BRANDS } from "@workspace/brand";

import { SITES } from "@/modules/shared/config/site";

/** Product sites = installations (packages/brand). Each installation has its own database. */
export const SITE_OPTIONS = SITES.map((code) => ({ label: BRANDS[code].name, value: code }));

export const eyebrow: TextField = {
    name: "eyebrow",
    type: "text",
    localized: true,
};

// Line breaks in titles are kept: one line in the admin is one line on the page.
export const title: TextareaField = {
    name: "title",
    type: "textarea",
    localized: true,
    required: true,
    admin: { rows: 2 },
};

export const text: TextareaField = {
    name: "text",
    type: "textarea",
    localized: true,
    admin: { rows: 3 },
};

export const anchor: TextField = {
    name: "anchor",
    type: "text",
    admin: { description: "Id for in-page links and the nav highlight, e.g. funciones" },
};

export const link = (name: string, label: string): GroupField => ({
    name,
    label,
    type: "group",
    fields: [
        { name: "label", type: "text", localized: true },
        {
            name: "href",
            type: "text",
            admin: {
                description:
                    "/precios — page of this site, #entrada — anchor, crm:register / crm:login — the CRM, https://… — external",
            },
        },
    ],
});

export const sectionIntro: Field[] = [eyebrow, title, text];
