"use client";

import { useParams } from "next/navigation";

import { ProductDetailCard } from "@/modules/widgets/products";

export default function CrmProductDetailPage() {
    const params = useParams();
    const id = params.id as string;

    return <ProductDetailCard productId={id} />;
}
