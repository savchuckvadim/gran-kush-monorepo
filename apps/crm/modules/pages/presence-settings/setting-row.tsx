import type { ReactNode } from "react";

interface SettingRowProps {
    htmlFor: string;
    title: string;
    description: string;
    error?: string;
    children: ReactNode;
}

/** Одно правило: что оно значит слева, поле справа (на телефоне — под описанием). */
export function SettingRow({ htmlFor, title, description, error, children }: SettingRowProps) {
    return (
        <li className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
                <label htmlFor={htmlFor} className="font-medium">
                    {title}
                </label>
                <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
                {error && (
                    <p role="alert" className="mt-1 text-sm text-destructive">
                        {error}
                    </p>
                )}
            </div>
            <div className="shrink-0">{children}</div>
        </li>
    );
}
