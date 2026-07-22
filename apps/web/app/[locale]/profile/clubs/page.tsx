"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { useQuery } from "@tanstack/react-query";

import { $api } from "@/modules/shared/api";

type MyClub = {
    portalId: string;
    slug: string;
    displayName: string;
    memberId: string;
    membershipNumber?: string;
    isActive: boolean;
    joinedAt: string;
};

export default function MyClubsPage() {
    const params = useParams<{ locale: string }>();

    const { data, isLoading } = useQuery({
        queryKey: ["my-clubs"],
        queryFn: async () => {
            const res = await $api.GET("/lk/portals");
            return res.data as { clubs: MyClub[] } | undefined;
        },
    });

    return (
        <div className="mx-auto max-w-3xl px-4 py-10">
            <h1 className="mb-6 text-2xl font-bold">Мои клубы</h1>

            {isLoading ? <p className="text-muted-foreground">Загрузка…</p> : null}

            <div className="space-y-3">
                {(data?.clubs ?? []).map((club) => (
                    <div
                        key={club.memberId}
                        className="flex items-center justify-between rounded-xl border p-4"
                    >
                        <div>
                            <h2 className="font-semibold">{club.displayName}</h2>
                            <p className="text-xs text-muted-foreground">
                                {club.membershipNumber
                                    ? `№ ${club.membershipNumber} · `
                                    : ""}
                                с {new Date(club.joinedAt).toLocaleDateString()}
                                {!club.isActive ? " · неактивен" : ""}
                            </p>
                        </div>
                        <Link
                            className="text-sm text-primary hover:underline"
                            href={`/${params.locale}/clubs/${club.slug}`}
                        >
                            Открыть
                        </Link>
                    </div>
                ))}
            </div>

            {data && data.clubs.length === 0 ? (
                <p className="text-muted-foreground">
                    Вы пока не состоите ни в одном клубе.{" "}
                    <Link className="text-primary hover:underline" href={`/${params.locale}/clubs`}>
                        Посмотреть клубы
                    </Link>
                </p>
            ) : null}
        </div>
    );
}
