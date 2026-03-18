import createClient from "openapi-fetch";

import { getAuthMiddleware } from "../auth/api-auth.middleware";
import { ApiAuthType } from "../auth/api-auth.type";
import { paths } from "../schema/schema";

export const configureApiClient =
    (baseurl: string, type: ApiAuthType): ReturnType<typeof createClient<paths>> => {

        const client = createClient<paths>({ baseUrl: baseurl });
        const authMiddleware = getAuthMiddleware(type, baseurl);
        client.use(authMiddleware);
        return client
    };

