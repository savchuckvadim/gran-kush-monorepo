import type { Block } from "payload";

import { anchor, eyebrow, link, sectionIntro, text, title } from "./fields";

export const HeroBlock: Block = {
    slug: "hero",
    interfaceName: "HeroBlock",
    labels: { singular: "Hero", plural: "Hero" },
    fields: [
        eyebrow,
        title,
        text,
        link("primary", "Main button"),
        link("secondary", "Second button"),
        { name: "hint", type: "text", localized: true },
        { name: "showLiveBar", type: "checkbox", defaultValue: true },
    ],
};

export const QrDoorBlock: Block = {
    slug: "qrDoor",
    interfaceName: "QrDoorBlock",
    labels: { singular: "QR door", plural: "QR door" },
    fields: [...sectionIntro, anchor],
};

export const FEATURE_ICONS = [
    "users",
    "scan",
    "gauge",
    "package",
    "wallet",
    "phone",
    "shield",
    "layers",
] as const;

export const FeatureGridBlock: Block = {
    slug: "featureGrid",
    interfaceName: "FeatureGridBlock",
    labels: { singular: "Feature grid", plural: "Feature grids" },
    fields: [
        eyebrow,
        title,
        anchor,
        {
            name: "items",
            type: "array",
            minRows: 1,
            maxRows: 9,
            fields: [
                {
                    name: "icon",
                    type: "select",
                    required: true,
                    defaultValue: "users",
                    options: FEATURE_ICONS.map((value) => ({ label: value, value })),
                },
                { name: "title", type: "text", localized: true, required: true },
                { name: "text", type: "text", localized: true },
            ],
        },
    ],
};

export const LimitFlaskBlock: Block = {
    slug: "limitFlask",
    interfaceName: "LimitFlaskBlock",
    labels: { singular: "Limit flask", plural: "Limit flasks" },
    fields: [
        ...sectionIntro,
        {
            type: "row",
            fields: [
                { name: "used", type: "number", defaultValue: 41, min: 0 },
                { name: "limit", type: "number", defaultValue: 60, min: 1 },
                { name: "maxDraw", type: "number", defaultValue: 30, min: 1 },
            ],
        },
    ],
};

export const ClubsMergeBlock: Block = {
    slug: "clubsMerge",
    interfaceName: "ClubsMergeBlock",
    labels: { singular: "Clubs merge", plural: "Clubs merge" },
    fields: [
        ...sectionIntro,
        {
            name: "clubs",
            type: "array",
            maxRows: 3,
            fields: [{ name: "name", type: "text", required: true }],
        },
        { name: "merged", type: "text", defaultValue: "PafPaf" },
    ],
};

export const PrivacyRolesBlock: Block = {
    slug: "privacyRoles",
    interfaceName: "PrivacyRolesBlock",
    labels: { singular: "Privacy by role", plural: "Privacy by role" },
    fields: [...sectionIntro, anchor],
};

export const PricingTeaserBlock: Block = {
    slug: "pricingTeaser",
    interfaceName: "PricingTeaserBlock",
    labels: { singular: "Pricing teaser", plural: "Pricing teasers" },
    fields: [...sectionIntro, link("cta", "Button")],
};

export const PricingTableBlock: Block = {
    slug: "pricingTable",
    interfaceName: "PricingTableBlock",
    labels: { singular: "Pricing table", plural: "Pricing tables" },
    fields: [
        ...sectionIntro,
        { name: "defaultMembers", type: "number", defaultValue: 400, min: 1 },
    ],
};

export const AddonsBlock: Block = {
    slug: "addons",
    interfaceName: "AddonsBlock",
    labels: { singular: "Add-ons", plural: "Add-ons" },
    fields: [
        eyebrow,
        title,
        {
            name: "items",
            type: "array",
            fields: [
                { name: "title", type: "text", localized: true, required: true },
                { name: "subtitle", type: "text", localized: true },
                { name: "price", type: "text", localized: true, required: true },
            ],
        },
    ],
};

export const FaqBlock: Block = {
    slug: "faq",
    interfaceName: "FaqBlock",
    labels: { singular: "FAQ", plural: "FAQ" },
    fields: [
        eyebrow,
        title,
        {
            name: "items",
            type: "array",
            fields: [
                { name: "question", type: "text", localized: true, required: true },
                { name: "answer", type: "textarea", localized: true, required: true },
            ],
        },
    ],
};

export const FinalCtaBlock: Block = {
    slug: "finalCta",
    interfaceName: "FinalCtaBlock",
    labels: { singular: "Final call", plural: "Final calls" },
    fields: [title, text, link("cta", "Button")],
};

export const PAGE_BLOCKS: Block[] = [
    HeroBlock,
    QrDoorBlock,
    FeatureGridBlock,
    LimitFlaskBlock,
    ClubsMergeBlock,
    PrivacyRolesBlock,
    PricingTeaserBlock,
    PricingTableBlock,
    AddonsBlock,
    FaqBlock,
    FinalCtaBlock,
];
