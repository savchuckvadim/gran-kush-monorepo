import { ApiAuthType, configureApiClient } from "@workspace/api-client/core";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";
const API_AUTH_TYPE = ApiAuthType.CRM;

const client = configureApiClient(API_BASE_URL, API_AUTH_TYPE, { authStrategy: "cookie" });

export const $api: ReturnType<typeof configureApiClient> = client;
export { API_BASE_URL };
