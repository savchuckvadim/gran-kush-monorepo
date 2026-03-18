"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { SchemaCreateFinancialTransactionDto } from "@workspace/api-client/core";

import {
    createTransaction,
    getReportByDate,
    getReportByType,
    getReportSummary,
    getTransactionById,
    getTransactions,
    type ReportFilter,
    type TransactionsFilter,
} from "../api/finance.api";

const FINANCE_KEYS = {
    all: ["finance"] as const,
    transactions: (filters?: TransactionsFilter) => [...FINANCE_KEYS.all, "list", filters] as const,
    detail: (id: string) => [...FINANCE_KEYS.all, "detail", id] as const,
    summary: (filters?: ReportFilter) => [...FINANCE_KEYS.all, "summary", filters] as const,
    byType: (filters?: ReportFilter) => [...FINANCE_KEYS.all, "by-type", filters] as const,
    byDate: (filters?: ReportFilter) => [...FINANCE_KEYS.all, "by-date", filters] as const,
};

export function useTransactions(filters?: TransactionsFilter) {
    return useQuery({
        queryKey: FINANCE_KEYS.transactions(filters),
        queryFn: () => getTransactions(filters),
    });
}

export function useTransactionDetail(id: string | null) {
    return useQuery({
        queryKey: FINANCE_KEYS.detail(id!),
        queryFn: () => getTransactionById(id!),
        enabled: !!id,
    });
}

export function useCreateTransaction() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: SchemaCreateFinancialTransactionDto) => createTransaction(data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: FINANCE_KEYS.all });
        },
    });
}

export function useReportSummary(filters?: ReportFilter) {
    return useQuery({
        queryKey: FINANCE_KEYS.summary(filters),
        queryFn: () => getReportSummary(filters),
    });
}

export function useReportByType(filters?: ReportFilter) {
    return useQuery({
        queryKey: FINANCE_KEYS.byType(filters),
        queryFn: () => getReportByType(filters),
    });
}

export function useReportByDate(filters?: ReportFilter) {
    return useQuery({
        queryKey: FINANCE_KEYS.byDate(filters),
        queryFn: () => getReportByDate(filters),
    });
}
