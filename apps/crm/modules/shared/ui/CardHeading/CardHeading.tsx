import type { ReactNode } from "react";

interface CardHeadingProps {
    title: string;
    hint?: string;
    /** Кнопки справа от заголовка: «Добавить», переключатели */
    actions?: ReactNode;
}

/** Заголовок секции внутри карточки: компактный, с подсказкой и действиями справа. */
export function CardHeading({ title, hint, actions }: CardHeadingProps) {
    return (
        <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
                <h2 className="font-semibold">{title}</h2>
                {hint && <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}
