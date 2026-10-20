import { ApiAuthType, ApiRefreshHelper } from "@workspace/api-client/core";

import { API_BASE_URL } from "./api";

/*
 * Обновление сессии для realtime: тот же помощник, что у API-клиентов, поэтому одновременный 401
 * запроса и отказ сокета делают один refresh, а не два.
 */
const crm = new ApiRefreshHelper(ApiAuthType.CRM, API_BASE_URL);
const cabinet = new ApiRefreshHelper(ApiAuthType.CABINET, API_BASE_URL);

export const refreshCrmSession = (): Promise<void> => crm.makeToken();

export const refreshCabinetSession = (): Promise<void> => cabinet.makeToken();
