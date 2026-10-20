import { Injectable } from "@nestjs/common";

import { Prisma, ProductAudience } from "@prisma/client";

type Decimal = Prisma.Decimal;

import { PrismaService } from "@common/prisma/prisma.service";
import { DomainEventPublisher, type EventsOf, type NewDomainEvent } from "@modules/events";
import { MeasurementUnit } from "@modules/portal/crm/catalog/domain/entity/measurement-unit.entity";
import { Product } from "@modules/portal/crm/catalog/domain/entity/product.entity";
import { ProductCategory } from "@modules/portal/crm/catalog/domain/entity/product-category.entity";
import { ProductImage } from "@modules/portal/crm/catalog/domain/entity/product-image.entity";
import {
    ProductFilters,
    ProductRepository,
} from "@modules/portal/crm/catalog/domain/repositories/product-repository.interface";
import {
    PRODUCT_INCLUDE,
    type ProductWithRelationsRow,
} from "@modules/portal/crm/catalog/infrastructure/prisma-includes/product.include";
import { ENTITY_DEFINITION_CODES } from "@modules/portal/crm/entity-fields/constants/entity-definition-codes";

@Injectable()
export class ProductPrismaRepository implements ProductRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly events: DomainEventPublisher
    ) {}

    async findById(id: string, portalId: string): Promise<Product | null> {
        const raw = await this.prisma.product.findFirst({
            where: { id, portalId },
            include: PRODUCT_INCLUDE,
        });
        return raw ? this.mapToEntity(raw) : null;
    }

    async findBySku(sku: string, portalId: string): Promise<Product | null> {
        const raw = await this.prisma.product.findFirst({
            where: { sku, portalId },
            include: PRODUCT_INCLUDE,
        });
        return raw ? this.mapToEntity(raw) : null;
    }

    async findAll(
        portalId: string,
        filters?: ProductFilters,
        limit?: number,
        skip?: number,
        sortBy: string = "createdAt",
        sortOrder: "asc" | "desc" = "desc"
    ): Promise<Product[]> {
        const where = this.buildWhere(portalId, filters);
        const rows = await this.prisma.product.findMany({
            where,
            take: limit,
            skip,
            include: PRODUCT_INCLUDE,
            orderBy: { [sortBy]: sortOrder },
        });
        return rows.map((r) => this.mapToEntity(r));
    }

    async findActive(portalId: string, audiences?: ProductAudience[]): Promise<Product[]> {
        const where: Prisma.ProductWhereInput = { portalId, isActive: true, isAvailable: true };
        if (audiences) {
            where.OR = [{ audiences: { isEmpty: true } }, { audiences: { hasSome: audiences } }];
        }
        const rows = await this.prisma.product.findMany({
            where,
            include: PRODUCT_INCLUDE,
            orderBy: { name: "asc" },
        });
        return rows.map((r) => this.mapToEntity(r));
    }

    async count(portalId: string, filters?: ProductFilters): Promise<number> {
        const where = this.buildWhere(portalId, filters);
        return this.prisma.product.count({ where });
    }

    async create(
        data: {
            portalId: string;
            categoryId: string;
            measurementUnitId: string;
            name: string;
            description?: string;
            sku?: string;
            price: Decimal;
            initialQuantity: Decimal;
            currentQuantity: Decimal;
            minQuantity?: Decimal;
            imageUrl?: string;
            thc?: Decimal;
            cbd?: Decimal;
            strain?: string;
            audiences?: ProductAudience[];
            limitGramsPerUnit?: Decimal;
            taxRateId?: string | null;
            priceIncludesTax?: boolean | null;
            createdBy?: string;
        },
        events?: EventsOf<Product>
    ): Promise<Product> {
        return this.prisma.$transaction(async (tx) => {
            const productDef = await tx.entityDefinition.findUniqueOrThrow({
                where: {
                    portalId_code: {
                        portalId: data.portalId,
                        code: ENTITY_DEFINITION_CODES.PRODUCT,
                    },
                },
            });
            const record = await tx.entityRecord.create({
                data: {
                    portalId: data.portalId,
                    entityDefinitionId: productDef.id,
                },
            });
            const raw = await tx.product.create({
                data: { ...data, entityRecordId: record.id },
                include: PRODUCT_INCLUDE,
            });
            const product = this.mapToEntity(raw);
            if (events) await this.events.publishMany(tx, events(product));
            return product;
        });
    }

    async update(
        id: string,
        data: Partial<{
            categoryId: string;
            measurementUnitId: string;
            name: string;
            description: string | null;
            sku: string | null;
            price: Decimal;
            initialQuantity: Decimal;
            currentQuantity: Decimal;
            minQuantity: Decimal | null;
            imageUrl: string | null;
            isActive: boolean;
            isAvailable: boolean;
            thc: Decimal | null;
            cbd: Decimal | null;
            strain: string | null;
            audiences: ProductAudience[];
            limitGramsPerUnit: Decimal | null;
            taxRateId: string | null;
            priceIncludesTax: boolean | null;
            updatedBy: string;
        }>,
        events?: readonly NewDomainEvent[]
    ): Promise<Product> {
        return this.prisma.$transaction(async (tx) => {
            const raw = await tx.product.update({
                where: { id },
                data,
                include: PRODUCT_INCLUDE,
            });
            if (events?.length) await this.events.publishMany(tx, events);
            return this.mapToEntity(raw);
        });
    }

    async delete(id: string, events?: readonly NewDomainEvent[]): Promise<void> {
        await this.prisma.$transaction(async (tx) => {
            await tx.product.delete({ where: { id } });
            if (events?.length) await this.events.publishMany(tx, events);
        });
    }

    // ─────────────────────────────────── private ───────────────────────────────────

    private buildWhere(portalId: string, filters?: ProductFilters): Prisma.ProductWhereInput {
        const where: Prisma.ProductWhereInput = { portalId };

        if (!filters) return where;

        if (filters.categoryId) where.categoryId = filters.categoryId;
        if (filters.isActive !== undefined) where.isActive = filters.isActive;
        if (filters.isAvailable !== undefined) where.isAvailable = filters.isAvailable;

        if (filters.search) {
            where.OR = [
                { name: { contains: filters.search, mode: "insensitive" } },
                { sku: { contains: filters.search, mode: "insensitive" } },
                { strain: { contains: filters.search, mode: "insensitive" } },
            ];
        }

        if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
            const priceFilter: Prisma.DecimalFilter = {};
            if (filters.minPrice !== undefined) {
                priceFilter.gte = new Prisma.Decimal(filters.minPrice);
            }
            if (filters.maxPrice !== undefined) {
                priceFilter.lte = new Prisma.Decimal(filters.maxPrice);
            }
            where.price = priceFilter;
        }

        return where;
    }

    private mapToEntity(raw: ProductWithRelationsRow): Product {
        return new Product({
            id: raw.id,
            portalId: raw.portalId,
            categoryId: raw.categoryId,
            measurementUnitId: raw.measurementUnitId,
            name: raw.name,
            description: raw.description,
            sku: raw.sku,
            price: raw.price,
            initialQuantity: raw.initialQuantity,
            currentQuantity: raw.currentQuantity,
            minQuantity: raw.minQuantity,
            imageUrl: raw.imageUrl,
            isActive: raw.isActive,
            isAvailable: raw.isAvailable,
            thc: raw.thc,
            cbd: raw.cbd,
            strain: raw.strain,
            audiences: raw.audiences,
            limitGramsPerUnit: raw.limitGramsPerUnit,
            taxRateId: raw.taxRateId,
            priceIncludesTax: raw.priceIncludesTax,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
            createdBy: raw.createdBy,
            updatedBy: raw.updatedBy,
            category: raw.category ? new ProductCategory(raw.category) : undefined,
            measurementUnit: raw.measurementUnit
                ? new MeasurementUnit(raw.measurementUnit)
                : undefined,
            images: raw.images.map((img) => new ProductImage(img)),
        });
    }
}
