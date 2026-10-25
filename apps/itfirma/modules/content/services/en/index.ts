import type { ServiceKey } from "@/modules/shared/config/services";

import type { ServicePageContent } from "../../types";

import { ai } from "./ai";
import { aiAdoption } from "./ai-adoption";
import { apps } from "./apps";
import { bitrix } from "./bitrix";
import { devops } from "./devops";
import { integrations } from "./integrations";
import { mobile } from "./mobile";
import { web } from "./web";

export const EN_SERVICES: Record<ServiceKey, ServicePageContent> = {
    web,
    apps,
    mobile,
    bitrix,
    integrations,
    ai,
    aiAdoption,
    devops,
};
