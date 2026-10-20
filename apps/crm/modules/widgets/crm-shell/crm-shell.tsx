"use client";

import { Suspense } from "react";

import { usePortalInfo } from "@/modules/entities/portal";
import { CommandPaletteProvider, EmailConfirmBanner } from "@/modules/features";
import { CrmSidebar } from "@/modules/processes";
import { useClubDefaultSkin } from "@/modules/shared/lib/skin";
import { AppFrame } from "@/modules/shared/ui/shell";
import { EntitySliderStack } from "@/modules/widgets/entity-slider";
import { ScanCodeFromUrl, ScannerDialog } from "@/modules/widgets/scanner";
import { SubscriptionGate } from "@/modules/widgets/subscription-gate";

import { CrmHeader } from "./crm-header";

/**
 * Оболочка CRM: общий каркас приложения, свои меню и шапка, палитра команд, слайдеры записей и
 * сканер кодов.
 * Тема клуба действует, пока сотрудник не выбрал свою.
 */
export function CrmShell({ children }: { children: React.ReactNode }) {
    useClubDefaultSkin(usePortalInfo().data?.defaultSkin);
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
            <ScannerDialog />
            <Suspense fallback={null}>
                <ScanCodeFromUrl />
            </Suspense>
        </CommandPaletteProvider>
    );
}
