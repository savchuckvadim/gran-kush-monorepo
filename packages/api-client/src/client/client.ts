import createClient from "openapi-fetch";
import { paths } from "../schema/schema";
import { ApiAuthType } from "../auth/api-auth.type";
import { getAuthMiddleware } from "../auth/api-auth.middleware";

export const configureApiClient =
    (baseurl: string, type: ApiAuthType): ReturnType<typeof createClient<paths>> => {

        const client = createClient<paths>({ baseUrl: baseurl });
        const authMiddleware = getAuthMiddleware(type, baseurl);
        client.use(authMiddleware);
        return client
    };

