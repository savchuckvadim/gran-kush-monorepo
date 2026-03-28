import { ApiAuthType, configureApiClient } from "@workspace/api-client/core";
import { ApiTokensStorage } from "@workspace/api-client/core";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const API_AUTH_TYPE = ApiAuthType.SITE;

const client = configureApiClient(API_BASE_URL, API_AUTH_TYPE);

export const $api: ReturnType<typeof configureApiClient> = client;

export const apiTokensStorage: ApiTokensStorage = new ApiTokensStorage(ApiAuthType.SITE);
