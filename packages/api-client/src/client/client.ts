import createClient, { type Client } from "openapi-fetch";

import { getAuthMiddleware } from "../auth/api-auth.middleware";
import { ApiAuthType } from "../auth/api-auth.type";
import { getIdempotencyMiddleware } from "../idempotency/idempotency.middleware";
import { getLocaleMiddleware } from "../locale/locale.middleware";
import { paths } from "../schema/schema";

/**
 * Клиент API одного приложения (`ApiAuthType`): сессия только в HttpOnly-куках, токены в JS не
 * попадают (AUTH_ARCHITECTURE §3.4). `P` — набор путей, которые ему можно вызывать
 * (`CrmPaths`, `CabinetPaths`); по умолчанию — весь API.
 */
export const configureApiClient = <P extends object = paths>(
    baseurl: string,
    type: ApiAuthType,
    options?: {
        getPortalSlug?: () => string | null;
        /** Язык интерфейса для `Accept-Language` (подписи системных полей и статусов). */
        getLocale?: () => string | null | undefined;
        /** Проставлять Idempotency-Key на мутациях. По умолчанию включено. */
        idempotency?: boolean;
        /**
         * Обновлять сессию на 401 через `POST /{aud}/auth/refresh` и повторять запрос. По умолчанию
         * включено; выключается, когда refresh делает сервер приложения (прокси админки).
         */
        refresh?: boolean;
    }
): Client<P> => {
    const client = createClient<P>({
        baseUrl: baseurl,
        fetch: (request: Request) => fetch(request, { credentials: "include" }),
    });
    // До auth-middleware: тот клонирует запрос для ретрая после 401 уже с ключом,
    // поэтому повтор идёт под тем же Idempotency-Key и с тем же языком.
    if (options?.idempotency !== false) {
        client.use(getIdempotencyMiddleware());
    }
    if (options?.getLocale) {
        client.use(getLocaleMiddleware(options.getLocale));
    }
    client.use(
        getAuthMiddleware(type, baseurl, {
            getPortalSlug: options?.getPortalSlug,
            refresh: options?.refresh,
        })
    );
    return client;
};
