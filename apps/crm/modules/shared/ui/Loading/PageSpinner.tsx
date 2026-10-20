import { Loader2 } from "lucide-react";

/** Спиннер на месте содержимого страницы, пока грузятся её данные (шапка и меню уже на месте). */
export function PageSpinner() {
    return (
        <div className="flex min-h-[50vh] items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
        </div>
    );
}
