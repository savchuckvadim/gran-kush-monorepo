import createClient from "openapi-fetch";

import { getAuthMiddleware } from "../auth/api-auth.middleware";
import { ApiAuthType } from "../auth/api-auth.type";
import { getIdempotencyMiddleware } from "../idempotency/idempotency.middleware";
import { paths } from "../schema/schema";

export type ApiAuthStrategy = "token" | "cookie";

export const configureApiClient = (
    baseurl: string,
    type: ApiAuthType,
    options?: {
        authStrategy?: ApiAuthStrategy;
        getPortalSlug?: () => string | null;
        /** Проставлять Idempotency-Key на мутациях. По умолчанию включено. */
        idempotency?: boolean;
    }
): ReturnType<typeof createClient<paths>> => {
    const authStrategy = options?.authStrategy ?? "token";
    const client = createClient<paths>({
        baseUrl: baseurl,
        fetch:
            authStrategy === "cookie"
                ? (request: Request) => fetch(request, { credentials: "include" })
                : undefined,
    });
    // До auth-middleware: тот клонирует запрос для ретрая после 401 уже с ключом,
    // поэтому повтор идёт под тем же Idempotency-Key.
    if (options?.idempotency !== false) {
        client.use(getIdempotencyMiddleware());
    }
    const authMiddleware = getAuthMiddleware(type, baseurl, authStrategy, options?.getPortalSlug);
    client.use(authMiddleware);
    return client;
};
