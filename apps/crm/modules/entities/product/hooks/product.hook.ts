"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
    SchemaCreateMeasurementUnitDto,
    SchemaCreateProductCategoryDto,
    SchemaCreateProductDto,
    SchemaUpdateMeasurementUnitDto,
    SchemaUpdateProductCategoryDto,
    SchemaUpdateProductDto,
} from "@workspace/api-client/core";

import {
    createCategory,
    createMeasurementUnit,
    createProduct,
    deleteCategory,
    deleteProduct,
    getCategories,
    getCategoriesTree,
    getMeasurementUnits,
    getProductById,
    getProducts,
    type ProductsFilter,
    updateCategory,
    updateMeasurementUnit,
    updateProduct,
} from "../api/product.api";

// ─── Query keys ──────────────────────────────────────────────────────────────

const PRODUCT_KEYS = {
    all: ["products"] as const,
    list: (filters?: ProductsFilter) => [...PRODUCT_KEYS.all, "list", filters] as const,
    detail: (id: string) => [...PRODUCT_KEYS.all, "detail", id] as const,
    categories: ["categories"] as const,
    categoriesTree: ["categories", "tree"] as const,
    units: ["measurement-units"] as const,
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

// ─── Categories ──────────────────────────────────────────────────────────────

export function useCategories() {
    return useQuery({
        queryKey: PRODUCT_KEYS.categories,
        queryFn: getCategories,
    });
}

export function useCategoriesTree() {
    return useQuery({
        queryKey: PRODUCT_KEYS.categoriesTree,
        queryFn: getCategoriesTree,
    });
}

export function useCreateCategory() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: SchemaCreateProductCategoryDto) => createCategory(data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: PRODUCT_KEYS.categories });
            qc.invalidateQueries({ queryKey: PRODUCT_KEYS.categoriesTree });
        },
    });
}

export function useUpdateCategory() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: SchemaUpdateProductCategoryDto }) =>
            updateCategory(id, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: PRODUCT_KEYS.categories });
            qc.invalidateQueries({ queryKey: PRODUCT_KEYS.categoriesTree });
        },
    });
}

export function useDeleteCategory() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deleteCategory(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: PRODUCT_KEYS.categories });
            qc.invalidateQueries({ queryKey: PRODUCT_KEYS.categoriesTree });
        },
    });
}

// ─── Measurement Units ───────────────────────────────────────────────────────

export function useMeasurementUnits() {
    return useQuery({
        queryKey: PRODUCT_KEYS.units,
        queryFn: getMeasurementUnits,
    });
}

export function useCreateMeasurementUnit() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: SchemaCreateMeasurementUnitDto) => createMeasurementUnit(data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: PRODUCT_KEYS.units });
        },
    });
}

export function useUpdateMeasurementUnit() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: SchemaUpdateMeasurementUnitDto }) =>
            updateMeasurementUnit(id, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: PRODUCT_KEYS.units });
        },
    });
}
