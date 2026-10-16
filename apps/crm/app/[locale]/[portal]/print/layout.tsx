import type { ReactNode } from "react";

import { AuthProvider } from "@/modules/processes/auth";

/** Листы для печати: вход сотрудника нужен, оболочка CRM — нет. */
export default function PrintLayout({ children }: { children: ReactNode }) {
    return <AuthProvider>{children}</AuthProvider>;
}
