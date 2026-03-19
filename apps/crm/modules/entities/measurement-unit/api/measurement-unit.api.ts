import type {
    SchemaCreateMeasurementUnitDto,
    SchemaMeasurementUnitDto,
    SchemaUpdateMeasurementUnitDto,
} from "@workspace/api-client/core";

import { $api } from "@/modules/shared";

export async function getMeasurementUnits(): Promise<SchemaMeasurementUnitDto[]> {
    const response = await $api.GET("/crm/catalog/measurement-units");

    if (!response.response.ok) {
        throw new Error(`Failed to fetch measurement units: ${response.response.status}`);
    }

    return (response.data as SchemaMeasurementUnitDto[]) ?? [];
}

export async function createMeasurementUnit(
    data: SchemaCreateMeasurementUnitDto
): Promise<SchemaMeasurementUnitDto> {
    const response = await $api.POST("/crm/catalog/measurement-units", {
        body: data,
    });

    if (!response.response.ok) {
        throw new Error(`Failed to create measurement unit: ${response.response.status}`);
    }

    return response.data as SchemaMeasurementUnitDto;
}

export async function updateMeasurementUnit(
    id: string,
    data: SchemaUpdateMeasurementUnitDto
): Promise<SchemaMeasurementUnitDto> {
    const response = await $api.PATCH("/crm/catalog/measurement-units/{id}", {
        params: { path: { id } },
        body: data,
    });

    if (!response.response.ok) {
        throw new Error(`Failed to update measurement unit: ${response.response.status}`);
    }

    return response.data as SchemaMeasurementUnitDto;
}
