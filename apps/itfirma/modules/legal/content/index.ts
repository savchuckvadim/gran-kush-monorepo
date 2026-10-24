import installation from "@/installation.json";
import type { Locale } from "@/modules/shared/config/locales";
import { CONTACT_EMAIL, OWNER } from "@/modules/shared/config/site";

import type { LegalContent, LegalDocument } from "../types";

import { ca } from "./ca";
import { en } from "./en";
import { es } from "./es";
import { ru } from "./ru";

const VALUES: Record<string, string> = {
    name: OWNER.name,
    nif: OWNER.nif,
    address: OWNER.address,
    email: CONTACT_EMAIL,
    domain: installation.domain,
};

const fill = (text: string) =>
    text.replace(/\{(\w+)\}/g, (match, key: string) => VALUES[key] ?? match);

const fillDocument = (doc: LegalDocument): LegalDocument => ({
    title: doc.title,
    sections: doc.sections.map((section) => ({
        heading: section.heading,
        paragraphs: section.paragraphs.map(fill),
    })),
});

const fillContent = (content: LegalContent): LegalContent => ({
    "aviso-legal": fillDocument(content["aviso-legal"]),
    privacidad: fillDocument(content.privacidad),
    cookies: fillDocument(content.cookies),
});

export const LEGAL_CONTENT: Record<Locale, LegalContent> = {
    es: fillContent(es),
    en: fillContent(en),
    ru: fillContent(ru),
    ca: fillContent(ca),
};
