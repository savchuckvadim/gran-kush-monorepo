import { ApiAuthType, type CabinetPaths, configureApiClient } from "@workspace/api-client/core";

import { getClubSlugFromPath } from "@/modules/shared/config/club-routes";

import { API_BASE_URL } from "./api";
import { getUiLocaleForApiClient } from "./api-locale";

/**
 * Клиент кабинета участника (`/cabinet/*`). Живёт рядом с клиентом CRM `$api`, но это другой
 * принципал: свои куки (`cabinet_*`), свой refresh и клуб из видимого адреса `club.`
 * (`/{язык}/{клуб}/…`), а не из дерева `[portal]` CRM.
 *
 * Два клиента в одном бандле не мешают друг другу: refresh в api-client идёт по одному запросу
 * на тип клиента. Пути — только `/cabinet/*` (`CabinetPaths`): эндпоинт CRM отсюда не вызвать.
 */
export const $cabinetApi = configureApiClient<CabinetPaths>(API_BASE_URL, ApiAuthType.CABINET, {
    getPortalSlug: () =>
        typeof window === "undefined" ? null : getClubSlugFromPath(window.location.pathname),
    getLocale: getUiLocaleForApiClient,
});
