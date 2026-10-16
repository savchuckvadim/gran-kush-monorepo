import type { ReactNode } from "react";

import { AuthProvider } from "@/modules/processes/auth";
import { AppMessagesProvider } from "@/modules/shared/providers/app-messages-provider";

/** Листы для печати: вход сотрудника нужен, оболочка CRM — нет. */
export default function PrintLayout({ children }: { children: ReactNode }) {
    return (
        <AppMessagesProvider>
            <AuthProvider>{children}</AuthProvider>
        </AppMessagesProvider>
    );
}
