"use client";

import * as React from "react";
import { useTheme } from "next-themes";

import { Moon, Sun } from "lucide-react";

import { Button } from "@workspace/ui/components/button";

interface ThemeToggleProps {
    /** Shown when the app forces one theme (next-themes `forcedTheme`) and the toggle is off. */
    forcedHint?: string;
}

export function ThemeToggle({ forcedHint }: ThemeToggleProps) {
    const { theme, setTheme, forcedTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <Button variant="ghost" size="icon" className="size-8">
                <Sun className="size-4" />
                <span className="sr-only">Toggle theme</span>
            </Button>
        );
    }

    if (forcedTheme) {
        // A disabled button gets no hover, so the hint sits on a wrapper.
        return (
            <span title={forcedHint} className="inline-flex">
                <Button variant="ghost" size="icon" className="size-8" disabled>
                    {forcedTheme === "light" ? (
                        <Moon className="size-4" />
                    ) : (
                        <Sun className="size-4" />
                    )}
                    <span className="sr-only">{forcedHint ?? "Toggle theme"}</span>
                </Button>
            </span>
        );
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        >
            {theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
            <span className="sr-only">Toggle theme</span>
        </Button>
    );
}
