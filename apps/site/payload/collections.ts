import type { CollectionConfig } from "payload";

import { anyone, authenticated } from "./access";
import { PAGE_BLOCKS } from "./blocks";
import { SITE_OPTIONS } from "./fields";

export const Users: CollectionConfig = {
    slug: "users",
    auth: true,
    admin: { useAsTitle: "email" },
    access: {
        create: authenticated,
        delete: authenticated,
        read: authenticated,
        update: authenticated,
    },
    fields: [{ name: "name", type: "text" }],
};

export const Media: CollectionConfig = {
    slug: "media",
    access: { read: anyone, create: authenticated, update: authenticated, delete: authenticated },
    upload: { mimeTypes: ["image/*", "video/mp4", "video/webm"] },
    fields: [{ name: "alt", type: "text", localized: true }],
};

// One document per product site: contacts and footer copy the editors can change.
export const Sites: CollectionConfig = {
    slug: "sites",
    access: { read: anyone, create: authenticated, update: authenticated, delete: authenticated },
    admin: { useAsTitle: "name", defaultColumns: ["name", "code", "domain"] },
    fields: [
        { name: "code", type: "select", required: true, unique: true, options: SITE_OPTIONS },
        { name: "name", type: "text", required: true },
        { name: "domain", type: "text" },
        {
            name: "contacts",
            type: "group",
            fields: [
                { name: "email", type: "email" },
                { name: "phone", type: "text" },
                { name: "whatsapp", type: "text" },
                { name: "telegram", type: "text" },
            ],
        },
        { name: "footerNote", type: "textarea", localized: true },
        { name: "legalNote", type: "textarea", localized: true },
    ],
};

export const Pages: CollectionConfig = {
    slug: "pages",
    access: { read: anyone, create: authenticated, update: authenticated, delete: authenticated },
    admin: { useAsTitle: "title", defaultColumns: ["title", "site", "slug", "updatedAt"] },
    indexes: [{ fields: ["site", "slug"], unique: true }],
    fields: [
        { name: "title", type: "text", required: true, localized: true },
        {
            type: "row",
            fields: [
                {
                    name: "site",
                    type: "select",
                    required: true,
                    defaultValue: "pafpaf",
                    options: SITE_OPTIONS,
                },
                {
                    name: "slug",
                    type: "text",
                    required: true,
                    index: true,
                    admin: { description: "home — the main page; precios — /es/precios" },
                },
            ],
        },
        {
            name: "seo",
            type: "group",
            fields: [
                { name: "title", type: "text", localized: true },
                { name: "description", type: "textarea", localized: true },
            ],
        },
        { name: "layout", type: "blocks", blocks: PAGE_BLOCKS, admin: { initCollapsed: true } },
    ],
};

// Marketing copy of each plan. Prices come from the billing API (BillingPlan); the fallback
// numbers are shown only while the API is unreachable.
export const Plans: CollectionConfig = {
    slug: "plans",
    access: { read: anyone, create: authenticated, update: authenticated, delete: authenticated },
    admin: { useAsTitle: "name", defaultColumns: ["name", "code", "order"] },
    defaultSort: "order",
    fields: [
        {
            type: "row",
            fields: [
                {
                    name: "code",
                    type: "select",
                    required: true,
                    unique: true,
                    options: [
                        { label: "Calada", value: "calada" },
                        { label: "Club", value: "club" },
                        { label: "Cadena", value: "cadena" },
                    ],
                },
                { name: "name", type: "text", required: true },
                { name: "order", type: "number", defaultValue: 0 },
            ],
        },
        { name: "forWhom", type: "text", localized: true },
        {
            name: "features",
            type: "array",
            fields: [{ name: "text", type: "text", localized: true, required: true }],
        },
        {
            name: "maxMembers",
            type: "number",
            admin: { description: "Calculator threshold; empty means no limit" },
        },
        { name: "highlight", type: "checkbox", defaultValue: false },
        {
            name: "billing",
            type: "group",
            admin: {
                description:
                    "Fallback prices in EUR without VAT, used only when the billing API is down",
            },
            fields: [
                {
                    type: "row",
                    fields: [
                        { name: "monthlyCode", type: "text" },
                        { name: "yearlyCode", type: "text" },
                        { name: "fallbackMonthly", type: "number" },
                        { name: "fallbackYearly", type: "number" },
                    ],
                },
            ],
        },
    ],
};
