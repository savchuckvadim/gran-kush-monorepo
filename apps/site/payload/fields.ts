import type { Field, GroupField, TextareaField, TextField } from "payload";

export const SITE_OPTIONS = [
    { label: "PafPaf", value: "pafpaf" },
    { label: "Nagual", value: "nagual" },
];

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
