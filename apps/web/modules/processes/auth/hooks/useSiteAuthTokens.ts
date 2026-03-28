"use client";

import * as React from "react";

import { apiTokensStorage } from "@/modules/shared/api";

export function useSiteAuthTokens() {
    const [hydrated, setHydrated] = React.useState(false);

    React.useEffect(() => setHydrated(true), []);

    const accessToken = hydrated ? apiTokensStorage.getAccessToken() : null;
    const hasAccessToken = hydrated && !!accessToken;

    return { hydrated, accessToken, hasAccessToken };
}
