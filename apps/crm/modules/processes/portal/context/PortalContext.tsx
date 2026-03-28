"use client";

import * as React from "react";

type PortalContextValue = {
    portalSlug: string | null;
    hasPortal: boolean;
};

const PortalContext = React.createContext<PortalContextValue | null>(null);

export function PortalProvider({
    portalSlug,
    children,
}: {
    portalSlug: string | null;
    children: React.ReactNode;
}) {
    const normalizedPortalSlug = portalSlug?.trim() || null;

    const value = React.useMemo<PortalContextValue>(
        () => ({
            portalSlug: normalizedPortalSlug,
            hasPortal: !!normalizedPortalSlug,
        }),
        [normalizedPortalSlug]
    );

    return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}

export function usePortal() {
    const ctx = React.useContext(PortalContext);
    if (!ctx) {
        throw new Error("usePortal must be used within <PortalProvider />");
    }
    return ctx;
}
