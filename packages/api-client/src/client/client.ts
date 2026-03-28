import createClient from "openapi-fetch";

import { getAuthMiddleware } from "../auth/api-auth.middleware";
import { ApiAuthType } from "../auth/api-auth.type";
import { paths } from "../schema/schema";

export type ApiAuthStrategy = "token" | "cookie";

export const configureApiClient = (
    baseurl: string,
    type: ApiAuthType,
    options?: { authStrategy?: ApiAuthStrategy }
): ReturnType<typeof createClient<paths>> => {
    const authStrategy = options?.authStrategy ?? "token";
    const client = createClient<paths>({
        baseUrl: baseurl,
        fetch:
            authStrategy === "cookie"
                ? (request: Request) => fetch(request, { credentials: "include" })
                : undefined,
    });
    const authMiddleware = getAuthMiddleware(type, baseurl, authStrategy);
    client.use(authMiddleware);
    return client;
};
