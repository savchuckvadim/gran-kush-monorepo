"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { useQuery } from "@tanstack/react-query";
import { MapPin, Star } from "lucide-react";

import { $api } from "@/modules/shared/api";

type MapPortal = {
    id: string;
    slug: string;
    displayName: string;
    publicDescription?: string | null;
    city?: string | null;
    country?: string | null;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    averageRating: number | null;
    reviewsCount: number;
};

export default function ClubsPage() {
    const params = useParams<{ locale: string }>();

    const { data, isLoading, isError } = useQuery({
        queryKey: ["public-portals-map"],
        queryFn: async () => {
            const res = await $api.GET("/public/portals/map");
            return res.data as { portals: MapPortal[] } | undefined;
        },
    });

    return (
        <div className="mx-auto max-w-4xl px-4 py-10">
            <h1 className="mb-6 text-2xl font-bold">Клубы</h1>

            {isLoading ? <p className="text-muted-foreground">Загрузка…</p> : null}
            {isError ? <p className="text-destructive">Не удалось загрузить клубы</p> : null}

            <div className="grid gap-4 md:grid-cols-2">
                {(data?.portals ?? []).map((portal) => (
                    <Link
                        key={portal.id}
                        href={`/${params.locale}/clubs/${portal.slug}`}
                        className="rounded-xl border p-4 transition hover:border-primary"
                    >
                        <div className="flex items-start justify-between gap-2">
                            <h2 className="text-lg font-semibold">{portal.displayName}</h2>
                            {portal.averageRating !== null ? (
                                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <Star className="size-4 fill-yellow-400 text-yellow-400" />
                                    {portal.averageRating} ({portal.reviewsCount})
                                </span>
                            ) : null}
                        </div>
                        {portal.publicDescription ? (
                            <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                                {portal.publicDescription}
                            </p>
                        ) : null}
                        {portal.city || portal.address ? (
                            <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin className="size-3.5" />
                                {[portal.address, portal.city, portal.country]
                                    .filter(Boolean)
                                    .join(", ")}
                            </p>
                        ) : null}
                    </Link>
                ))}
            </div>

            {data && data.portals.length === 0 ? (
                <p className="text-muted-foreground">Пока ни один клуб не опубликован на карте.</p>
            ) : null}
        </div>
    );
}
