"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
    SchemaCreateMeasurementUnitDto,
    SchemaUpdateMeasurementUnitDto,
} from "@workspace/api-client/core";

import {
    createMeasurementUnit,
    getMeasurementUnits,
    updateMeasurementUnit,
} from "../api/measurement-unit.api";

const MEASUREMENT_UNIT_KEYS = {
    all: ["measurement-units"] as const,
    list: ["measurement-units", "list"] as const,
};

export function useMeasurementUnits() {
    return useQuery({
        queryKey: MEASUREMENT_UNIT_KEYS.list,
        queryFn: getMeasurementUnits,
    });
}

export function useCreateMeasurementUnit() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: SchemaCreateMeasurementUnitDto) => createMeasurementUnit(data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: MEASUREMENT_UNIT_KEYS.all });
            qc.invalidateQueries({ queryKey: ["products"] });
        },
    });
}

export function useUpdateMeasurementUnit() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: SchemaUpdateMeasurementUnitDto }) =>
            updateMeasurementUnit(id, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: MEASUREMENT_UNIT_KEYS.all });
            qc.invalidateQueries({ queryKey: ["products"] });
        },
    });
}
