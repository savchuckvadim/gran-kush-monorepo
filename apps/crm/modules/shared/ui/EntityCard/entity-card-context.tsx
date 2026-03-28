"use client";

import * as React from "react";

export interface EntityCardContextValue {
    sectionsCollapseCookieKey?: string;
}

export const EntityCardContext = React.createContext<EntityCardContextValue | null>(null);

export function useEntityCardContextOptional(): EntityCardContextValue | null {
    return React.useContext(EntityCardContext);
}
