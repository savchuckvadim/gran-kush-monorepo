import { ThemeToggle } from "@workspace/ui/components/theme-toggle";

import { LangSwitcher } from "@/modules/features/lang-switcher/lang-switcher";

export function HeaderActions() {
    return (
        <div className="flex items-center gap-4" role="group" aria-label="Header actions">
            <LangSwitcher />
            <ThemeToggle />
        </div>
    );
}
