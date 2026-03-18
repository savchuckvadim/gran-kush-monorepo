import { MeasurementUnitDto } from "@catalog/api/dto/measurement-unit.dto";
import { MeasurementUnit } from "@catalog/domain/entity/measurement-unit.entity";

/**
 * Маппинг MeasurementUnit entity → MeasurementUnitDto
 */
export function mapMeasurementUnitToDto(u: MeasurementUnit): MeasurementUnitDto {
    return {
        id: u.id,
        code: u.code,
        name: u.name,
        description: u.description,
        isCustom: u.isCustom,
        isActive: u.isActive,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
    };
}
