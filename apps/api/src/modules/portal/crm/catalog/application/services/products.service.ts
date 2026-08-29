import {
    BadRequestException,
    ConflictException,
    Injectable,
    Logger,
    NotFoundException,
} from "@nestjs/common";

import { Prisma } from "@prisma/client";

type Decimal = Prisma.Decimal;

import { Product } from "@modules/portal/crm/catalog/domain/entity/product.entity";
import { MeasurementUnitRepository } from "@modules/portal/crm/catalog/domain/repositories/measurement-unit-repository.interface";
import { ProductCategoryRepository } from "@modules/portal/crm/catalog/domain/repositories/product-category-repository.interface";
import {
    ProductFilters,
    ProductRepository,
} from "@modules/portal/crm/catalog/domain/repositories/product-repository.interface";

@Injectable()
export class ProductsService {
    private readonly logger = new Logger(ProductsService.name);

    constructor(
        private readonly productRepository: ProductRepository,
        private readonly categoryRepository: ProductCategoryRepository,
        private readonly unitRepository: MeasurementUnitRepository
    ) {}

    async findById(id: string, portalId: string): Promise<Product | null> {
        return this.productRepository.findById(id, portalId);
    }

    async findAll(
        portalId: string,
        filters?: ProductFilters,
        limit?: number,
        skip?: number,
        sortBy?: string,
        sortOrder?: "asc" | "desc"
    ): Promise<Product[]> {
        return this.productRepository.findAll(portalId, filters, limit, skip, sortBy, sortOrder);
    }

    async findActive(portalId: string): Promise<Product[]> {
        return this.productRepository.findActive(portalId);
    }

    async count(portalId: string, filters?: ProductFilters): Promise<number> {
        return this.productRepository.count(portalId, filters);
    }

    async create(
        dto: {
            categoryId: string;
            measurementUnitId: string;
            name: string;
            description?: string;
            sku?: string;
            price: number;
            initialQuantity: number;
            minQuantity?: number;
            imageUrl?: string;
            thc?: number;
            cbd?: number;
            strain?: string;
        },
        portalId: string,
        employeeId: string
    ): Promise<Product> {
        const category = await this.categoryRepository.findById(dto.categoryId, portalId);
        if (!category) {
            throw new NotFoundException(`Category with id "${dto.categoryId}" not found`);
        }

        const unit = await this.unitRepository.findById(portalId, dto.measurementUnitId);
        if (!unit) {
            throw new NotFoundException(
                `Measurement unit with id "${dto.measurementUnitId}" not found`
            );
        }

        if (dto.sku) {
            const existing = await this.productRepository.findBySku(dto.sku, portalId);
            if (existing) {
                throw new ConflictException(`Product with SKU "${dto.sku}" already exists`);
            }
        }

        return this.productRepository.create({
            portalId,
            categoryId: dto.categoryId,
            measurementUnitId: dto.measurementUnitId,
            name: dto.name,
            description: dto.description,
            sku: dto.sku,
            price: new Prisma.Decimal(dto.price),
            initialQuantity: new Prisma.Decimal(dto.initialQuantity),
            currentQuantity: new Prisma.Decimal(dto.initialQuantity),
            minQuantity:
                dto.minQuantity !== undefined ? new Prisma.Decimal(dto.minQuantity) : undefined,
            imageUrl: dto.imageUrl,
            thc: dto.thc !== undefined ? new Prisma.Decimal(dto.thc) : undefined,
            cbd: dto.cbd !== undefined ? new Prisma.Decimal(dto.cbd) : undefined,
            strain: dto.strain,
            createdBy: employeeId,
        });
    }

    async update(
        id: string,
        dto: Partial<{
            categoryId: string;
            measurementUnitId: string;
            name: string;
            description: string | null;
            sku: string | null;
            price: number;
            initialQuantity: number;
            currentQuantity: number;
            minQuantity: number | null;
            imageUrl: string | null;
            isActive: boolean;
            isAvailable: boolean;
            thc: number | null;
            cbd: number | null;
            strain: string | null;
        }>,
        portalId: string,
        employeeId: string
    ): Promise<Product> {
        const product = await this.productRepository.findById(id, portalId);
        if (!product) {
            throw new NotFoundException("Product not found");
        }

        if (dto.categoryId) {
            const category = await this.categoryRepository.findById(dto.categoryId, portalId);
            if (!category) {
                throw new NotFoundException(`Category with id "${dto.categoryId}" not found`);
            }
        }

        if (dto.measurementUnitId) {
            const unit = await this.unitRepository.findById(portalId, dto.measurementUnitId);
            if (!unit) {
                throw new NotFoundException(
                    `Measurement unit with id "${dto.measurementUnitId}" not found`
                );
            }
        }

        if (dto.sku && dto.sku !== product.sku) {
            const existing = await this.productRepository.findBySku(dto.sku, portalId);
            if (existing) {
                throw new ConflictException(`Product with SKU "${dto.sku}" already exists`);
            }
        }

        const data: Record<string, unknown> = { updatedBy: employeeId };
        if (dto.categoryId !== undefined) data.categoryId = dto.categoryId;
        if (dto.measurementUnitId !== undefined) data.measurementUnitId = dto.measurementUnitId;
        if (dto.name !== undefined) data.name = dto.name;
        if (dto.description !== undefined) data.description = dto.description;
        if (dto.sku !== undefined) data.sku = dto.sku;
        if (dto.price !== undefined) data.price = new Prisma.Decimal(dto.price);
        if (dto.initialQuantity !== undefined)
            data.initialQuantity = new Prisma.Decimal(dto.initialQuantity);
        if (dto.currentQuantity !== undefined)
            data.currentQuantity = new Prisma.Decimal(dto.currentQuantity);
        if (dto.minQuantity !== undefined)
            data.minQuantity =
                dto.minQuantity !== null ? new Prisma.Decimal(dto.minQuantity) : null;
        if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl;
        if (dto.isActive !== undefined) data.isActive = dto.isActive;
        if (dto.isAvailable !== undefined) data.isAvailable = dto.isAvailable;
        if (dto.thc !== undefined) data.thc = dto.thc !== null ? new Prisma.Decimal(dto.thc) : null;
        if (dto.cbd !== undefined) data.cbd = dto.cbd !== null ? new Prisma.Decimal(dto.cbd) : null;
        if (dto.strain !== undefined) data.strain = dto.strain;

        return this.productRepository.update(id, data);
    }

    async delete(id: string, portalId: string): Promise<void> {
        const product = await this.productRepository.findById(id, portalId);
        if (!product) {
            throw new NotFoundException("Product not found");
        }
        return this.productRepository.delete(id);
    }

    /**
     * Обновить количество товара (при заказе или возврате).
     * @param delta — отрицательный = списание, положительный = возврат
     */
    async adjustQuantity(productId: string, portalId: string, delta: Decimal): Promise<Product> {
        const product = await this.productRepository.findById(productId, portalId);
        if (!product) {
            throw new NotFoundException("Product not found");
        }

        const newQuantity = product.currentQuantity.plus(delta);
        if (newQuantity.isNegative()) {
            throw new BadRequestException(
                `Insufficient quantity for product "${product.name}". ` +
                    `Available: ${product.currentQuantity.toString()}, requested: ${delta.abs().toString()}`
            );
        }

        const updated = await this.productRepository.update(productId, {
            currentQuantity: newQuantity,
            isAvailable: newQuantity.greaterThan(0),
        });

        if (
            product.minQuantity &&
            newQuantity.lessThanOrEqualTo(product.minQuantity) &&
            product.currentQuantity.greaterThan(product.minQuantity)
        ) {
            this.logger.warn(
                `Low stock alert: Product "${product.name}" (${product.id}) quantity ` +
                    `${newQuantity.toString()} ≤ min ${product.minQuantity.toString()}`
            );
        }

        return updated;
    }
}
