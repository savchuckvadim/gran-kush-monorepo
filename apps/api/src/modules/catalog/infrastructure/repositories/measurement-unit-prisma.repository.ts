import { Injectable } from "@nestjs/common";

import { MeasurementUnit } from "@catalog/domain/entity/measurement-unit.entity";
import { MeasurementUnitRepository } from "@catalog/domain/repositories/measurement-unit-repository.interface";

import { PrismaService } from "@common/prisma/prisma.service";

@Injectable()
export class MeasurementUnitPrismaRepository implements MeasurementUnitRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findById(id: string): Promise<MeasurementUnit | null> {
        const unit = await this.prisma.measurementUnit.findUnique({ where: { id } });
        return unit ? this.mapToEntity(unit) : null;
    }

    async findByCode(code: string): Promise<MeasurementUnit | null> {
        const unit = await this.prisma.measurementUnit.findUnique({ where: { code } });
        return unit ? this.mapToEntity(unit) : null;
    }

    async findAll(onlyActive?: boolean): Promise<MeasurementUnit[]> {
        const units = await this.prisma.measurementUnit.findMany({
            where: onlyActive ? { isActive: true } : undefined,
            orderBy: { name: "asc" },
        });
        return units.map((u) => this.mapToEntity(u));
    }

    async count(): Promise<number> {
        return this.prisma.measurementUnit.count();
    }

    async create(data: {
        code: string;
        name: string;
        description?: string;
        isCustom?: boolean;
    }): Promise<MeasurementUnit> {
        const unit = await this.prisma.measurementUnit.create({ data });
        return this.mapToEntity(unit);
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
        const unit = await this.prisma.measurementUnit.update({ where: { id }, data });
        return this.mapToEntity(unit);
    }

    async delete(id: string): Promise<void> {
        await this.prisma.measurementUnit.delete({ where: { id } });
    }

    private mapToEntity(raw: {
        id: string;
        code: string;
        name: string;
        description: string | null;
        isCustom: boolean;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }): MeasurementUnit {
        return new MeasurementUnit({
            id: raw.id,
            code: raw.code,
            name: raw.name,
            description: raw.description,
            isCustom: raw.isCustom,
            isActive: raw.isActive,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
        });
    }
}
