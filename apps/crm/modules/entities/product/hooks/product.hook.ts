"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
    SchemaCreateProductDto,
    SchemaUpdateProductDto,
} from "@workspace/api-client/core";

import {
    createProduct,
    deleteProduct,
    getProductById,
    getProducts,
    type ProductsFilter,
    updateProduct,
} from "../api/product.api";

// ─── Query keys ──────────────────────────────────────────────────────────────

const PRODUCT_KEYS = {
    all: ["products"] as const,
    list: (filters?: ProductsFilter) => [...PRODUCT_KEYS.all, "list", filters] as const,
    detail: (id: string) => [...PRODUCT_KEYS.all, "detail", id] as const,
};

// ─── Products ────────────────────────────────────────────────────────────────

export function useProducts(filters?: ProductsFilter) {
    return useQuery({
        queryKey: PRODUCT_KEYS.list(filters),
        queryFn: () => getProducts(filters),
    });
}

export function useProductDetail(id: string | null) {
    return useQuery({
        queryKey: PRODUCT_KEYS.detail(id!),
        queryFn: () => getProductById(id!),
        enabled: !!id,
    });
}

export function useCreateProduct() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: SchemaCreateProductDto) => createProduct(data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: PRODUCT_KEYS.all });
        },
    });
}

export function useUpdateProduct() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: SchemaUpdateProductDto }) =>
            updateProduct(id, data),
        onSuccess: (_, { id }) => {
            qc.invalidateQueries({ queryKey: PRODUCT_KEYS.all });
            qc.invalidateQueries({ queryKey: PRODUCT_KEYS.detail(id) });
        },
    });
}

export function useDeleteProduct() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deleteProduct(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: PRODUCT_KEYS.all });
        },
    });
}
