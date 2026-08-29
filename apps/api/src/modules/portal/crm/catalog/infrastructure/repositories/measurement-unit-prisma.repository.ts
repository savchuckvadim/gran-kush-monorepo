import { Injectable } from "@nestjs/common";

import { PrismaService } from "@common/prisma/prisma.service";
import { MeasurementUnit } from "@modules/portal/crm/catalog/domain/entity/measurement-unit.entity";
import { MeasurementUnitRepository } from "@modules/portal/crm/catalog/domain/repositories/measurement-unit-repository.interface";

@Injectable()
export class MeasurementUnitPrismaRepository implements MeasurementUnitRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findById(portalId: string, id: string): Promise<MeasurementUnit | null> {
        // findFirst, а не findUnique по id: портал должен попасть в условие, иначе
        // подстановка чужого id вернула бы единицу соседнего клуба.
        const unit = await this.prisma.measurementUnit.findFirst({ where: { id, portalId } });
        return unit ? this.mapToEntity(unit) : null;
    }

    async findByCode(portalId: string, code: string): Promise<MeasurementUnit | null> {
        const unit = await this.prisma.measurementUnit.findUnique({
            where: { portalId_code: { portalId, code } },
        });
        return unit ? this.mapToEntity(unit) : null;
    }

    async findAll(portalId: string, onlyActive?: boolean): Promise<MeasurementUnit[]> {
        const units = await this.prisma.measurementUnit.findMany({
            where: onlyActive ? { portalId, isActive: true } : { portalId },
            orderBy: { name: "asc" },
        });
        return units.map((u) => this.mapToEntity(u));
    }

    async count(portalId: string): Promise<number> {
        return this.prisma.measurementUnit.count({ where: { portalId } });
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
        const unit = await this.prisma.measurementUnit.create({ data: { ...data, portalId } });
        return this.mapToEntity(unit);
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
    ): Promise<MeasurementUnit | null> {
        // updateMany с портулом в условии: update по одному id правил бы чужую строку.
        const { count } = await this.prisma.measurementUnit.updateMany({
            where: { id, portalId },
            data,
        });
        if (count === 0) {
            return null;
        }
        return this.findById(portalId, id);
    }

    async delete(portalId: string, id: string): Promise<boolean> {
        const { count } = await this.prisma.measurementUnit.deleteMany({
            where: { id, portalId },
        });
        return count > 0;
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
