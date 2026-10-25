import type { Locale } from "@/modules/shared/config/locales";
import type { ServiceKey } from "@/modules/shared/config/services";

import type { ServicePageContent } from "../types";

import { CA_SERVICES } from "./ca";
import { EN_SERVICES } from "./en";
import { ES_SERVICES } from "./es";
import { RU_SERVICES } from "./ru";
import { UK_SERVICES } from "./uk";

const BY_LOCALE: Record<Locale, Record<ServiceKey, ServicePageContent>> = {
    es: ES_SERVICES,
    en: EN_SERVICES,
    ru: RU_SERVICES,
    uk: UK_SERVICES,
    ca: CA_SERVICES,
};

export const getServiceContent = (locale: Locale, key: ServiceKey): ServicePageContent =>
    BY_LOCALE[locale][key];
