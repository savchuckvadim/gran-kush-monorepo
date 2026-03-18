import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";

import { MeasurementUnit } from "@catalog/domain/entity/measurement-unit.entity";
import { MeasurementUnitRepository } from "@catalog/domain/repositories/measurement-unit-repository.interface";

@Injectable()
export class MeasurementUnitsService {
    constructor(private readonly repository: MeasurementUnitRepository) {}

    async findById(id: string): Promise<MeasurementUnit | null> {
        return this.repository.findById(id);
    }

    async findByCode(code: string): Promise<MeasurementUnit | null> {
        return this.repository.findByCode(code);
    }

    async findAll(onlyActive?: boolean): Promise<MeasurementUnit[]> {
        return this.repository.findAll(onlyActive);
    }

    async create(data: {
        code: string;
        name: string;
        description?: string;
        isCustom?: boolean;
    }): Promise<MeasurementUnit> {
        // Проверка уникальности code
        const existing = await this.repository.findByCode(data.code);
        if (existing) {
            throw new ConflictException(`Measurement unit with code "${data.code}" already exists`);
        }
        return this.repository.create(data);
    }

    async update(
        id: string,
        data: Partial<{
            code: string;
            name: string;
            description: string | null;
            isCustom: boolean;
            isActive: boolean;
        }>
    ): Promise<MeasurementUnit> {
        const unit = await this.repository.findById(id);
        if (!unit) {
            throw new NotFoundException("Measurement unit not found");
        }

        // Проверка уникальности code при обновлении
        if (data.code && data.code !== unit.code) {
            const existing = await this.repository.findByCode(data.code);
            if (existing) {
                throw new ConflictException(
                    `Measurement unit with code "${data.code}" already exists`
                );
            }
        }

        return this.repository.update(id, data);
    }

    async delete(id: string): Promise<void> {
        const unit = await this.repository.findById(id);
        if (!unit) {
            throw new NotFoundException("Measurement unit not found");
        }
        return this.repository.delete(id);
    }
}
