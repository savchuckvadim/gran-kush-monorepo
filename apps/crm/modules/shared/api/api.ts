import { ApiAuthType, configureApiClient, type CrmPaths } from "@workspace/api-client/core";

import { getCrmPortalSlugForApiClient } from "@/modules/processes/portal/utils/crm-portal-context";

import { getUiLocaleForApiClient } from "./api-locale";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

/**
 * Клиент CRM (сотрудник). Пути — всё, кроме `/cabinet/*` (`CrmPaths`): кабинет участника ходит
 * через свой `$cabinetApi` с другими куками.
 */
export const $api = configureApiClient<CrmPaths>(API_BASE_URL, ApiAuthType.CRM, {
    authStrategy: "cookie",
    getPortalSlug: getCrmPortalSlugForApiClient,
    getLocale: getUiLocaleForApiClient,
});

export { API_BASE_URL };
