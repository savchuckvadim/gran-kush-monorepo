import { ApiAuthType, configureApiClient } from "@workspace/api-client/core";

import { getUiLocaleForApiClient } from "./api-locale";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const API_AUTH_TYPE = ApiAuthType.SITE;

const client = configureApiClient(API_BASE_URL, API_AUTH_TYPE, {
    authStrategy: "cookie",
    getLocale: getUiLocaleForApiClient,
});

export const $api: ReturnType<typeof configureApiClient> = client;
