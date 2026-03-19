"use client";

import * as React from "react";

interface SidebarContextType {
    isOpen: boolean;
    toggle: () => void;
    close: () => void;
}

const SidebarContext = React.createContext<SidebarContextType>({
    isOpen: false,
    toggle: () => {},
    close: () => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = React.useState(false);

    const toggle = React.useCallback(() => setIsOpen((value) => !value), []);
    const close = React.useCallback(() => setIsOpen(false), []);

    return <SidebarContext.Provider value={{ isOpen, toggle, close }}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
    return React.useContext(SidebarContext);
}
