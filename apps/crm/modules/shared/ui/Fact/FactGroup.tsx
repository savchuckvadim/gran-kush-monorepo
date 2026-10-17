import type { ReactNode } from "react";

/** Группа строк профиля под мелким заголовком: «Контакты», «Работа». */
export function FactGroup({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="flex flex-col gap-2">
            <h3 className="text-[0.6875rem] font-semibold tracking-wider text-muted-foreground uppercase">
                {title}
            </h3>
            <dl className="flex flex-col gap-1.5">{children}</dl>
        </section>
    );
}
