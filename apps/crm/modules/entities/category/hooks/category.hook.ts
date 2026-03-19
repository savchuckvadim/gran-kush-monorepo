"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
    SchemaCreateProductCategoryDto,
    SchemaUpdateProductCategoryDto,
} from "@workspace/api-client/core";

import {
    createCategory,
    deleteCategory,
    getCategories,
    getCategoriesTree,
    updateCategory,
} from "../api/category.api";

const CATEGORY_KEYS = {
    all: ["categories"] as const,
    list: ["categories", "list"] as const,
    tree: ["categories", "tree"] as const,
};

export function useCategories() {
    return useQuery({
        queryKey: CATEGORY_KEYS.list,
        queryFn: getCategories,
    });
}

export function useCategoriesTree() {
    return useQuery({
        queryKey: CATEGORY_KEYS.tree,
        queryFn: getCategoriesTree,
    });
}

export function useCreateCategory() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: SchemaCreateProductCategoryDto) => createCategory(data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: CATEGORY_KEYS.all });
            qc.invalidateQueries({ queryKey: ["products"] });
        },
    });
}

export function useUpdateCategory() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: SchemaUpdateProductCategoryDto }) =>
            updateCategory(id, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: CATEGORY_KEYS.all });
            qc.invalidateQueries({ queryKey: ["products"] });
        },
    });
}

export function useDeleteCategory() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deleteCategory(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: CATEGORY_KEYS.all });
            qc.invalidateQueries({ queryKey: ["products"] });
        },
    });
}
