import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";

import { MeasurementUnit } from "@modules/portal/crm/catalog/domain/entity/measurement-unit.entity";
import { MeasurementUnitRepository } from "@modules/portal/crm/catalog/domain/repositories/measurement-unit-repository.interface";

@Injectable()
export class MeasurementUnitsService {
    constructor(private readonly repository: MeasurementUnitRepository) {}

    async findById(portalId: string, id: string): Promise<MeasurementUnit | null> {
        return this.repository.findById(portalId, id);
    }

    async findByCode(portalId: string, code: string): Promise<MeasurementUnit | null> {
        return this.repository.findByCode(portalId, code);
    }

    async findAll(portalId: string, onlyActive?: boolean): Promise<MeasurementUnit[]> {
        return this.repository.findAll(portalId, onlyActive);
    }

    async create(
        portalId: string,
        data: {
            code: string;
            name: string;
            description?: string;
            isCustom?: boolean;
        }
    ): Promise<MeasurementUnit> {
        // Код уникален внутри портала: занятый соседним клубом код больше не мешает.
        const existing = await this.repository.findByCode(portalId, data.code);
        if (existing) {
            throw new ConflictException(`Measurement unit with code "${data.code}" already exists`);
        }
        return this.repository.create(portalId, data);
    }

    async update(
        portalId: string,
        id: string,
        data: Partial<{
            code: string;
            name: string;
            description: string | null;
            isCustom: boolean;
            isActive: boolean;
        }>
    ): Promise<MeasurementUnit> {
        const unit = await this.repository.findById(portalId, id);
        if (!unit) {
            throw new NotFoundException("Measurement unit not found");
        }

        if (data.code && data.code !== unit.code) {
            const existing = await this.repository.findByCode(portalId, data.code);
            if (existing) {
                throw new ConflictException(
                    `Measurement unit with code "${data.code}" already exists`
                );
            }
        }

        const updated = await this.repository.update(portalId, id, data);
        if (!updated) {
            throw new NotFoundException("Measurement unit not found");
        }
        return updated;
    }

    async delete(portalId: string, id: string): Promise<void> {
        const deleted = await this.repository.delete(portalId, id);
        if (!deleted) {
            throw new NotFoundException("Measurement unit not found");
        }
    }
}
