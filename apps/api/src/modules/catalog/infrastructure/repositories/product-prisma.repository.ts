import { Injectable } from "@nestjs/common";

import { Prisma } from "@prisma/client";

type Decimal = Prisma.Decimal;

import { MeasurementUnit } from "@catalog/domain/entity/measurement-unit.entity";
import { Product } from "@catalog/domain/entity/product.entity";
import { ProductCategory } from "@catalog/domain/entity/product-category.entity";
import { ProductImage } from "@catalog/domain/entity/product-image.entity";
import {
    ProductFilters,
    ProductRepository,
} from "@catalog/domain/repositories/product-repository.interface";
import { PRODUCT_INCLUDE } from "@catalog/infrastructure/prisma-includes";

import { PrismaService } from "@common/prisma/prisma.service";

@Injectable()
export class ProductPrismaRepository implements ProductRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findById(id: string): Promise<Product | null> {
        const raw = await this.prisma.product.findUnique({
            where: { id },
            include: PRODUCT_INCLUDE,
        });
        return raw ? this.mapToEntity(raw) : null;
    }

    async findBySku(sku: string): Promise<Product | null> {
        const raw = await this.prisma.product.findUnique({
            where: { sku },
            include: PRODUCT_INCLUDE,
        });
        return raw ? this.mapToEntity(raw) : null;
    }

    async findAll(
        filters?: ProductFilters,
        limit?: number,
        skip?: number,
        sortBy: string = "createdAt",
        sortOrder: "asc" | "desc" = "desc"
    ): Promise<Product[]> {
        const where = this.buildWhere(filters);
        const rows = await this.prisma.product.findMany({
            where,
            take: limit,
            skip,
            include: PRODUCT_INCLUDE,
            orderBy: { [sortBy]: sortOrder },
        });
        return rows.map((r) => this.mapToEntity(r));
    }

    async findActive(): Promise<Product[]> {
        const rows = await this.prisma.product.findMany({
            where: { isActive: true, isAvailable: true },
            include: PRODUCT_INCLUDE,
            orderBy: { name: "asc" },
        });
        return rows.map((r) => this.mapToEntity(r));
    }

    async count(filters?: ProductFilters): Promise<number> {
        const where = this.buildWhere(filters);
        return this.prisma.product.count({ where });
    }

    async create(data: {
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
        createdBy?: string;
    }): Promise<Product> {
        const raw = await this.prisma.product.create({
            data,
            include: PRODUCT_INCLUDE,
        });
        return this.mapToEntity(raw);
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
            updatedBy: string;
        }>
    ): Promise<Product> {
        const raw = await this.prisma.product.update({
            where: { id },
            data,
            include: PRODUCT_INCLUDE,
        });
        return this.mapToEntity(raw);
    }

    async delete(id: string): Promise<void> {
        await this.prisma.product.delete({ where: { id } });
    }

    // ─────────────────────────────────── private ───────────────────────────────────

    private buildWhere(filters?: ProductFilters): Prisma.ProductWhereInput {
        if (!filters) return {};

        const where: Prisma.ProductWhereInput = {};

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
            where.price = {};
            if (filters.minPrice !== undefined)
                (where.price as any).gte = new Prisma.Decimal(filters.minPrice);
            if (filters.maxPrice !== undefined)
                (where.price as any).lte = new Prisma.Decimal(filters.maxPrice);
        }

        return where;
    }

    private mapToEntity(raw: any): Product {
        return new Product({
            id: raw.id,
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
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
            createdBy: raw.createdBy,
            updatedBy: raw.updatedBy,
            category: raw.category ? new ProductCategory(raw.category) : undefined,
            measurementUnit: raw.measurementUnit
                ? new MeasurementUnit(raw.measurementUnit)
                : undefined,
            images: raw.images?.map((img: any) => new ProductImage(img)) ?? [],
        });
    }
}
