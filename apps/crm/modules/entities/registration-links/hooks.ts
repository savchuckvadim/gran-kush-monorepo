"use client";

import { useEffect } from "react";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
    SchemaCreateRegistrationLinkDto,
    SchemaJoinViaLinkDto,
    SchemaUpdateRegistrationLinkDto,
} from "@workspace/api-client/core";

import { lkKeys } from "@/modules/entities/lk-account";

import {
    createRegistrationLink,
    joinViaLinkAsMember,
    leaveRegistrationLink,
    listRegistrationLinks,
    pingRegistrationLink,
    type RegistrationLinkListParams,
    revokeRegistrationLink,
    updateRegistrationLink,
} from "./api";

const linkKeys = {
    all: ["registration-links"] as const,
    list: (params: RegistrationLinkListParams) => [...linkKeys.all, "list", params] as const,
};

/** Online counters change while a dialog is open: it refetches every 15 seconds meanwhile. */
const LIVE_REFRESH_MS = 15_000;

export function useRegistrationLinks(
    params: RegistrationLinkListParams = {},
    options: { enabled?: boolean; live?: boolean } = {}
) {
    return useQuery({
        queryKey: linkKeys.list(params),
        queryFn: () => listRegistrationLinks(params),
        enabled: options.enabled ?? true,
        refetchInterval: options.live ? LIVE_REFRESH_MS : false,
        placeholderData: keepPreviousData,
    });
}

export function useCreateRegistrationLink() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (body: SchemaCreateRegistrationLinkDto) => createRegistrationLink(body),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: linkKeys.all }),
    });
}

/** Новое членство меняет список клубов аккаунта, поэтому кэш кабинета сбрасывается целиком. */
export function useJoinViaLinkAsMember(token: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (body: SchemaJoinViaLinkDto) => joinViaLinkAsMember(token, body),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: lkKeys.all }),
    });
}

export function useUpdateRegistrationLink() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, body }: { id: string; body: SchemaUpdateRegistrationLinkDto }) =>
            updateRegistrationLink(id, body),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: linkKeys.all }),
    });
}

export function useRevokeRegistrationLink() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => revokeRegistrationLink(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: linkKeys.all }),
    });
}

const HEARTBEAT_MS = 30_000;
const VIEWER_KEY = "pafpaf.reglink.viewer";

/** `randomUUID` exists only in secure contexts; `getRandomValues` works over plain http too. */
const randomId = (): string =>
    typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
              byte.toString(16).padStart(2, "0")
          ).join("");

/** One id per browser tab: two tabs of the same person count as two viewers, like two people. */
const viewerId = (): string => {
    try {
        const stored = window.sessionStorage.getItem(VIEWER_KEY);
        if (stored) return stored;
        const created = randomId();
        window.sessionStorage.setItem(VIEWER_KEY, created);
        return created;
    } catch {
        return randomId();
    }
};

/**
 * The page is really in front of someone: not a background tab, and not a prerendered copy —
 * Chrome may prerender a link shown in the CRM's own link dialog, with its own sessionStorage,
 * which counted the club's staff as one more viewer.
 */
const isShown = (): boolean =>
    document.visibilityState === "visible" &&
    !(document as Document & { prerendering?: boolean }).prerendering;

/** Keeps the viewer of a public form "online" for the club while the form is on screen. */
export function useRegistrationLinkPresence(token: string, enabled: boolean) {
    useEffect(() => {
        if (!enabled) return;
        let id: string | null = null;
        let timer: number | undefined;

        const start = () => {
            if (timer !== undefined || !isShown()) return;
            const viewer = (id ??= viewerId());
            const ping = () => void pingRegistrationLink(token, viewer).catch(() => undefined);
            ping();
            timer = window.setInterval(ping, HEARTBEAT_MS);
        };
        const stop = () => {
            if (timer === undefined) return;
            window.clearInterval(timer);
            timer = undefined;
            if (id) leaveRegistrationLink(token, id);
        };
        const onChange = () => (isShown() ? start() : stop());

        start();
        document.addEventListener("visibilitychange", onChange);
        document.addEventListener("prerenderingchange", onChange);
        window.addEventListener("pagehide", stop);
        return () => {
            document.removeEventListener("visibilitychange", onChange);
            document.removeEventListener("prerenderingchange", onChange);
            window.removeEventListener("pagehide", stop);
            stop();
        };
    }, [token, enabled]);
}
