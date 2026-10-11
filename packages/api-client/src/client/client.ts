import createClient from "openapi-fetch";

import { getAuthMiddleware } from "../auth/api-auth.middleware";
import { ApiAuthType } from "../auth/api-auth.type";
import { getIdempotencyMiddleware } from "../idempotency/idempotency.middleware";
import { getLocaleMiddleware } from "../locale/locale.middleware";
import { paths } from "../schema/schema";

export type ApiAuthStrategy = "token" | "cookie";

export const configureApiClient = (
    baseurl: string,
    type: ApiAuthType,
    options?: {
        authStrategy?: ApiAuthStrategy;
        getPortalSlug?: () => string | null;
        /** Язык интерфейса для `Accept-Language` (подписи системных полей и статусов). */
        getLocale?: () => string | null | undefined;
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
    // поэтому повтор идёт под тем же Idempotency-Key и с тем же языком.
    if (options?.idempotency !== false) {
        client.use(getIdempotencyMiddleware());
    }
    if (options?.getLocale) {
        client.use(getLocaleMiddleware(options.getLocale));
    }
    const authMiddleware = getAuthMiddleware(type, baseurl, authStrategy, options?.getPortalSlug);
    client.use(authMiddleware);
    return client;
};
