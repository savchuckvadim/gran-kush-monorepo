"use client";

import { CommandPaletteProvider, EmailConfirmBanner } from "@/modules/features";
import { CrmSidebar } from "@/modules/processes";
import { AppFrame } from "@/modules/shared/ui/shell";
import { EntitySliderStack } from "@/modules/widgets/entity-slider";
import { SubscriptionGate } from "@/modules/widgets/subscription-gate";

import { CrmHeader } from "./crm-header";

/** Оболочка CRM: общий каркас приложения, свои меню и шапка, палитра команд и слайдеры записей. */
export function CrmShell({ children }: { children: React.ReactNode }) {
    return (
        <CommandPaletteProvider>
            <AppFrame
                sidebar={<CrmSidebar />}
                header={<CrmHeader />}
                banner={<EmailConfirmBanner />}
            >
                <SubscriptionGate>{children}</SubscriptionGate>
            </AppFrame>
            <EntitySliderStack />
        </CommandPaletteProvider>
    );
}
