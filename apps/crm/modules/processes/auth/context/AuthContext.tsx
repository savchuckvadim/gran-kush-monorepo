"use client";

import * as React from "react";

import type { SchemaEmployeeMeResponseDto } from "@workspace/api-client/core";

export type AuthContextValue = {
    currentUser: SchemaEmployeeMeResponseDto | null;
    isAuthenticated: boolean;
    isProtected: boolean;
    isAuthLoading: boolean;
    error: Error | null;
    refetchCurrentUser: () => Promise<unknown>;
};

export const AuthContext = React.createContext<AuthContextValue | null>(null);

export function useAuth() {
    const ctx = React.useContext(AuthContext);
    if (!ctx) {
        throw new Error("useAuth must be used within <AuthProvider />");
    }
    return ctx;
}
