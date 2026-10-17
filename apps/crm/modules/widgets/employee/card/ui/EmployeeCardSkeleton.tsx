import { Skeleton } from "@workspace/ui";

/** Форма карточки, пока она грузится: ничего не прыгает, когда данные приходят. */
export function EmployeeCardSkeleton() {
    return (
        <div className="flex flex-col gap-4" aria-busy="true">
            <div className="flex items-center gap-4 rounded-2xl p-4 ring-1 ring-foreground/10 md:p-6">
                <Skeleton className="size-16 rounded-full md:size-20" />
                <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-7 w-56 max-w-full" />
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-64 max-w-full" />
                </div>
            </div>
            <Skeleton className="h-64 rounded-xl" />
        </div>
    );
}
