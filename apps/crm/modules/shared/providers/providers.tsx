"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";

import { getForcedMode } from "@/modules/shared/config/skins";

import { SkinModeScript, SkinProvider, useSkin } from "./skin-provider";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
        },
    },
});

// A skin with one mode forces it, otherwise `dark:` variants disagree with the skin colours.
function ThemeProvider({ children }: { children: React.ReactNode }) {
    const { definition } = useSkin();

    return (
        <NextThemesProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
            enableColorScheme
            forcedTheme={getForcedMode(definition)}
        >
            <SkinModeScript />
            {children}
        </NextThemesProvider>
    );
}

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <QueryClientProvider client={queryClient}>
            <SkinProvider>
                <ThemeProvider>
                    {children}
                    <Toaster richColors closeButton />
                </ThemeProvider>
            </SkinProvider>
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
    );
}
