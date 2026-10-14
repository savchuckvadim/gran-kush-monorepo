import { Skeleton } from "@workspace/ui";

/** The shape of the card while it loads, so nothing jumps when it arrives. */
export function MemberCardSkeleton() {
    return (
        <div className="flex flex-col gap-4" aria-busy="true">
            <div className="flex items-center gap-4 rounded-2xl p-4 ring-1 ring-foreground/10 md:p-6">
                <Skeleton className="size-16 rounded-full md:size-20" />
                <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-7 w-56" />
                    <Skeleton className="h-5 w-72 max-w-full" />
                    <Skeleton className="h-4 w-48" />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {Array.from({ length: 4 }, (_, index) => (
                    <Skeleton key={index} className="h-20 rounded-xl" />
                ))}
            </div>
            <Skeleton className="h-9 w-80 max-w-full" />
            <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
                <Skeleton className="h-72 rounded-xl" />
                <Skeleton className="h-72 rounded-xl" />
            </div>
        </div>
    );
}
