"use client";

import Link from "next/link";

import type { ComponentProps, MouseEvent } from "react";

import {
    canSlide,
    type EntityKind,
    sliderStore,
    useEntityHref,
} from "@/modules/shared/lib/entity-slider";

export interface EntityLinkProps extends Omit<ComponentProps<typeof Link>, "href"> {
    kind: EntityKind;
    id: string;
}

const opensNewTab = (event: MouseEvent<HTMLAnchorElement>): boolean =>
    event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;

/**
 * A real link to the entity's page. A plain click on a wide screen opens it in a slider over the
 * page; Ctrl/⌘, the middle button and a phone keep the browser's own behaviour.
 */
export function EntityLink({ kind, id, onClick, children, ...props }: EntityLinkProps) {
    const hrefOf = useEntityHref();
    const href = hrefOf({ kind, id });

    const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(event);
        if (event.defaultPrevented || opensNewTab(event) || !canSlide()) return;
        event.preventDefault();
        sliderStore.open({ kind, id }, href);
    };

    return (
        <Link href={href} {...props} onClick={handleClick}>
            {children}
        </Link>
    );
}
