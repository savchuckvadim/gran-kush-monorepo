import { BrandModuleGate } from "@/modules/shared/ui/brand-module-gate";

export default function Layout({ children }: { children: React.ReactNode }) {
    return <BrandModuleGate module="club-policy">{children}</BrandModuleGate>;
}
