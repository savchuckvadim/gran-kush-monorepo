"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
    type FormCellRef,
    getFormCellEntries,
    getPeriodReport,
    getTaxForms,
    type QuarterRef,
} from "../api/finance-reports.api";
import { ledgerKeys } from "../model/ledger-keys";

export function usePeriodReport(range: { from: string; to: string }) {
    return useQuery({
        queryKey: ledgerKeys.periodReport(range),
        queryFn: () => getPeriodReport(range),
        placeholderData: keepPreviousData,
    });
}

export function useTaxForms(quarter: QuarterRef) {
    return useQuery({
        queryKey: ledgerKeys.taxForms(quarter),
        queryFn: () => getTaxForms(quarter),
        placeholderData: keepPreviousData,
    });
}

export function useFormCellEntries(ref: FormCellRef | null, page: number, limit: number) {
    return useQuery({
        queryKey: ledgerKeys.formCellEntries(ref, page),
        queryFn: () => (ref ? getFormCellEntries(ref, { page, limit }) : Promise.reject()),
        enabled: Boolean(ref),
        placeholderData: keepPreviousData,
    });
}
