import type { ReactNode } from "react";

import { AppMessagesProvider } from "@/modules/shared/providers/app-messages-provider";

/** Сканер стойки — раздел сотрудника: полный словарь CRM. */
export default function ScanLayout({ children }: { children: ReactNode }) {
    return <AppMessagesProvider>{children}</AppMessagesProvider>;
}
