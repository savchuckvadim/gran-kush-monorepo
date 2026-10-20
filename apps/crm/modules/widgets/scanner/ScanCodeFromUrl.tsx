"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { SCAN_CODE_PARAM } from "@/modules/entities/scan";
import { scannerStore } from "@/modules/shared/lib/scan";

/**
 * `?scanCode=` на любой странице CRM — код, прочитанный обычной камерой телефона (ссылка с
 * этикетки ведёт сюда через `/scan`): сканер открывается на нём, параметр уходит из адреса.
 */
export function ScanCodeFromUrl() {
    const params = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const code = params.get(SCAN_CODE_PARAM);

    useEffect(() => {
        if (!code) return;
        scannerStore.open(code);
        const rest = new URLSearchParams(params.toString());
        rest.delete(SCAN_CODE_PARAM);
        const query = rest.toString();
        router.replace(query ? `${pathname}?${query}` : pathname);
    }, [code, params, pathname, router]);

    return null;
}
