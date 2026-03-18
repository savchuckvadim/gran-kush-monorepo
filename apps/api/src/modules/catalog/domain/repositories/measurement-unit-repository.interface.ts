import { MeasurementUnit } from "@catalog/domain/entity/measurement-unit.entity";

export abstract class MeasurementUnitRepository {
    abstract findById(id: string): Promise<MeasurementUnit | null>;
    abstract findByCode(code: string): Promise<MeasurementUnit | null>;
    abstract findAll(onlyActive?: boolean): Promise<MeasurementUnit[]>;
    abstract count(): Promise<number>;
    abstract create(data: {
        code: string;
        name: string;
        description?: string;
        isCustom?: boolean;
    }): Promise<MeasurementUnit>;
    abstract update(
        id: string,
        data: Partial<{
            code: string;
            name: string;
            description: string | null;
            isCustom: boolean;
            isActive: boolean;
        }>
    ): Promise<MeasurementUnit>;
    abstract delete(id: string): Promise<void>;
}
