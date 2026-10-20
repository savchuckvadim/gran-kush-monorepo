import { parseLabelRequest } from "@/modules/features/product-labels";
import { ProductLabelsPrintPage } from "@/modules/pages/product-labels-print";

export default async function Page({
    searchParams,
}: {
    searchParams: Promise<{
        ids?: string | string[];
        format?: string | string[];
        copies?: string | string[];
    }>;
}) {
    return <ProductLabelsPrintPage request={parseLabelRequest(await searchParams)} />;
}
