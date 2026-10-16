import type { ReactNode } from "react";

import { SkinBackdrop } from "@/modules/shared/ui/SkinBackdrop";

interface AppFrameProps {
    sidebar: ReactNode;
    header: ReactNode;
    /** Над содержимым страницы, внутри общей колонки: баннеры, предупреждения */
    banner?: ReactNode;
    children: ReactNode;
}

/**
 * Каркас приложения CRM и кабинета: подложка темы, сайдбар слева, шапка и страница справа.
 * `data-slot` — точки, к которым привязаны стили тем (`skins/*.css`); менять вместе с ними.
 */
export function AppFrame({ sidebar, header, banner, children }: AppFrameProps) {
    return (
        <div data-slot="app-shell" className="flex min-h-screen min-w-full flex-row">
            <SkinBackdrop />
            {sidebar}
            <div data-slot="app-column" className="flex w-full min-w-0 flex-1 flex-col">
                {header}
                <main data-slot="app-main" className="relative flex min-w-0 flex-1 flex-col">
                    <div className="container mx-auto flex flex-1 flex-col p-3 pt-4 md:p-6">
                        {banner}
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
