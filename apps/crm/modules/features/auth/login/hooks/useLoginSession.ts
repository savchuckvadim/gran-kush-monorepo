import { useMutation, useQuery } from "@tanstack/react-query";

import type { SchemaMyPortalDto } from "@workspace/api-client/core";

import { $api } from "@/modules/shared";

const fetchMyClubs = async (): Promise<SchemaMyPortalDto[] | null> => {
    // 401 after the client's own refresh attempt means there is no session to restore
    const result = await $api.GET("/crm/my-portals");
    return result.response.ok ? (result.data?.portals ?? []) : null;
};

/**
 * The login page's view of the session: `clubs === null` — signed out, show the form;
 * an array — signed in (possibly restored from the refresh cookie), pick a club.
 */
export function useLoginSession() {
    const query = useQuery({
        queryKey: ["auth", "login-session"],
        queryFn: fetchMyClubs,
        retry: false,
        staleTime: 0,
    });

    const signOut = useMutation({
        mutationFn: () => $api.POST("/crm/auth/logout"),
        onSettled: () => query.refetch(),
    });

    return {
        clubs: query.isError ? null : (query.data ?? null),
        isLoading: query.isLoading,
        refetch: () => void query.refetch(),
        signOut: () => signOut.mutate(),
        isSigningOut: signOut.isPending,
    };
}
