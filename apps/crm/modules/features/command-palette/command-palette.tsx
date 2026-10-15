"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Boxes, CreditCard, Package, Palette, ShoppingBag, UserRound } from "lucide-react";

import { assertOpenApiOk } from "@workspace/api-client/core";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@workspace/ui";

import { useCrmNavigation, usePortal } from "@/modules/processes";
import { $api, useDebouncedValue } from "@/modules/shared";
import { ROUTES } from "@/modules/shared/config/routes";
import { type EntityRef, useOpenEntity } from "@/modules/shared/lib/entity-slider";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

const MIN_QUERY = 2;
const DEBOUNCE_MS = 200;

const CommandPaletteContext = createContext<{ open: () => void }>({ open: () => {} });

/** Открыть палитру из любой кнопки (поиск в шапке). */
export const useCommandPalette = () => useContext(CommandPaletteContext);

const matches = (text: string, query: string) =>
    text.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());

/** Ctrl/⌘ K: разделы CRM и поиск по участникам, товарам и заказам клуба. */
export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const open = useCallback(() => setIsOpen(true), []);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
                event.preventDefault();
                setIsOpen((value) => !value);
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    const context = useMemo(() => ({ open }), [open]);

    return (
        <CommandPaletteContext.Provider value={context}>
            {children}
            {isOpen && <CommandPalette onClose={() => setIsOpen(false)} />}
        </CommandPaletteContext.Provider>
    );
}

function CommandPalette({ onClose }: { onClose: () => void }) {
    const t = useTranslations("crm.search");
    const router = useRouter();
    const localizedLink = useLocalizedLink();
    const { portalSlug } = usePortal();
    const navigation = useCrmNavigation();
    const [query, setQuery] = useState("");
    const debounced = useDebouncedValue(query.trim(), DEBOUNCE_MS);
    const searchable = debounced.length >= MIN_QUERY;

    const results = useQuery({
        queryKey: ["crm-search", portalSlug, debounced],
        enabled: searchable,
        placeholderData: keepPreviousData,
        queryFn: async () =>
            assertOpenApiOk(await $api.GET("/crm/search", { params: { query: { q: debounced } } })),
    });

    const pages = [
        ...navigation.map((item) => ({
            key: item.code,
            title: item.title,
            url: item.url,
            icon: item.icon,
        })),
        {
            key: "billing",
            title: t("pages.billing"),
            url: localizedLink(ROUTES.CRM_SETTINGS_BILLING),
            icon: <CreditCard />,
        },
        {
            key: "appearance",
            title: t("pages.appearance"),
            url: localizedLink(ROUTES.CRM_SETTINGS_APPEARANCE),
            icon: <Palette />,
        },
    ].filter((page) => !query.trim() || matches(page.title, query));

    const openEntity = useOpenEntity();
    const go = (url: string) => {
        onClose();
        router.push(url);
    };
    /** Members and orders open in a slider over the page the search was called on. */
    const openFound = (ref: EntityRef) => {
        onClose();
        openEntity(ref);
    };

    const data = searchable ? results.data : undefined;
    const nothingFound =
        pages.length === 0 &&
        (!searchable ||
            (data !== undefined &&
                data.members.length + data.products.length + data.orders.length === 0));

    return (
        <CommandDialog
            open
            onOpenChange={(value) => !value && onClose()}
            title={t("title")}
            description={t("description")}
            shouldFilter={false}
        >
            <CommandInput value={query} onValueChange={setQuery} placeholder={t("placeholder")} />
            <CommandList>
                {nothingFound && <CommandEmpty>{t("empty")}</CommandEmpty>}

                {data && data.members.length > 0 && (
                    <CommandGroup heading={t("groups.members")}>
                        {data.members.map((member) => (
                            <CommandItem
                                key={member.id}
                                value={`member-${member.id}`}
                                onSelect={() => openFound({ kind: "member", id: member.id })}
                            >
                                <UserRound />
                                <span className="min-w-0 flex-1 truncate">{member.name}</span>
                                <span className="text-muted-foreground text-xs">
                                    {member.membershipNumber
                                        ? t("memberNumber", { number: member.membershipNumber })
                                        : member.email}
                                </span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {data && data.products.length > 0 && (
                    <CommandGroup heading={t("groups.products")}>
                        {data.products.map((product) => (
                            <CommandItem
                                key={product.id}
                                value={`product-${product.id}`}
                                onSelect={() =>
                                    go(localizedLink(`${ROUTES.CRM_PRODUCT_DETAILS}/${product.id}`))
                                }
                            >
                                <Package />
                                <span className="min-w-0 flex-1 truncate">{product.name}</span>
                                {product.sku && (
                                    <span className="text-muted-foreground text-xs">
                                        {product.sku}
                                    </span>
                                )}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {data && data.orders.length > 0 && (
                    <CommandGroup heading={t("groups.orders")}>
                        {data.orders.map((order) => (
                            <CommandItem
                                key={order.id}
                                value={`order-${order.id}`}
                                onSelect={() => openFound({ kind: "order", id: order.id })}
                            >
                                <ShoppingBag />
                                <span className="min-w-0 flex-1 truncate">{order.orderNumber}</span>
                                <span className="text-muted-foreground text-xs">
                                    {order.memberName}
                                </span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {pages.length > 0 && (
                    <CommandGroup heading={t("groups.pages")}>
                        {pages.map((page) => (
                            <CommandItem
                                key={page.key}
                                value={`page-${page.key}`}
                                onSelect={() => go(page.url)}
                            >
                                {page.icon ?? <Boxes />}
                                <span>{page.title}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {searchable && results.isFetching && !data && (
                    <p className="text-muted-foreground px-4 py-3 text-sm">{t("searching")}</p>
                )}
            </CommandList>
        </CommandDialog>
    );
}
