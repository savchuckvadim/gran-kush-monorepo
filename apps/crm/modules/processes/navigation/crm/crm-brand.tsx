"use client";

import { usePortalInfo } from "@/modules/entities/portal";
import { BRAND } from "@/modules/shared/config/brand";
import { ShellBrand } from "@/modules/shared/ui/Brand";

/** Бренд инсталляции, а на тарифе с `customBrand` — название клуба. */
export function CrmBrand() {
    const { data: info } = usePortalInfo();
    const clubName = info?.subscription?.features.customBrand ? info.displayName : null;

    return <ShellBrand name={BRAND.name} clubName={clubName} />;
}
