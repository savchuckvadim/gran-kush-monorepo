import { ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";

import { Prisma, ProductAudience } from "@prisma/client";

import { isUniqueViolationOn } from "@common/prisma/unique-violation";
import { Product } from "@modules/portal/crm/catalog/domain/entity/product.entity";
import { isVisibleTo } from "@modules/portal/crm/catalog/domain/product-audience";
import { BARCODE_TAKEN, normalizeBarcode } from "@modules/portal/crm/catalog/domain/product-code";
import { MeasurementUnitRepository } from "@modules/portal/crm/catalog/domain/repositories/measurement-unit-repository.interface";
import { ProductCategoryRepository } from "@modules/portal/crm/catalog/domain/repositories/product-category-repository.interface";
import {
    ProductFilters,
    ProductRepository,
} from "@modules/portal/crm/catalog/domain/repositories/product-repository.interface";
import { TaxRatesService } from "@modules/portal/crm/finance/application/services/tax-rates.service";
import { StockService } from "@modules/portal/crm/stock/application/services/stock.service";

import { productChangedEvents } from "../events/product-events";

const barcodeTaken = (barcode: string) =>
    new ConflictException({
        message: `Barcode "${barcode}" is already used by another product`,
        code: BARCODE_TAKEN,
    });

/** Тот же штрихкод успел занять соседний запрос — 409, как и при проверке до записи. */
const rethrowBarcodeTaken =
    (barcode: string | null | undefined) =>
    (error: unknown): never => {
        if (barcode && isUniqueViolationOn(error, "barcode")) throw barcodeTaken(barcode);
        throw error;
    };

@Injectable()
export class ProductsService {
    private readonly logger = new Logger(ProductsService.name);

    constructor(
        private readonly productRepository: ProductRepository,
        private readonly categoryRepository: ProductCategoryRepository,
        private readonly unitRepository: MeasurementUnitRepository,
        private readonly taxRates: TaxRatesService,
        private readonly stock: StockService
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

    /** Товар по коду QR-этикетки (без префикса `P-`), только в этом клубе. */
    async findByCode(code: string, portalId: string): Promise<Product | null> {
        return this.productRepository.findByCode(code, portalId);
    }

    /** Товар по штрихкоду упаковки, только в этом клубе. */
    async findByBarcode(barcode: string, portalId: string): Promise<Product | null> {
        return this.productRepository.findByBarcode(barcode, portalId);
    }

    /** `audiences` — витрина участника: только товары, которые клуб показывает его аудиториям. */
    async findActive(portalId: string, audiences?: ProductAudience[]): Promise<Product[]> {
        return this.productRepository.findActive(portalId, audiences);
    }

    /** Товар витрины: активный, доступный, не расходник и видимый аудиториям участника, иначе `null`. */
    async findForShop(
        id: string,
        portalId: string,
        audiences: ProductAudience[]
    ): Promise<Product | null> {
        const product = await this.productRepository.findById(id, portalId);
        if (!product?.isActive || !product.isAvailable || product.isConsumable) return null;
        return isVisibleTo(product.audiences, audiences) ? product : null;
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
            barcode?: string;
            isConsumable?: boolean;
            price: number;
            initialQuantity: number;
            minQuantity?: number;
            imageUrl?: string;
            thc?: number;
            cbd?: number;
            strain?: string;
            audiences?: ProductAudience[];
            limitGramsPerUnit?: number | null;
            taxRateId?: string | null;
            priceIncludesTax?: boolean | null;
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
        const barcode = normalizeBarcode(dto.barcode);
        if (barcode) await this.assertBarcodeFree(portalId, barcode);
        // ставка — только своего клуба и не архивная
        if (dto.taxRateId) await this.taxRates.usable(portalId, dto.taxRateId);

        return this.productRepository
            .create(
                {
                    portalId,
                    categoryId: dto.categoryId,
                    measurementUnitId: dto.measurementUnitId,
                    name: dto.name,
                    description: dto.description,
                    sku: dto.sku,
                    barcode,
                    isConsumable: dto.isConsumable ?? false,
                    price: new Prisma.Decimal(dto.price),
                    initialQuantity: new Prisma.Decimal(dto.initialQuantity),
                    currentQuantity: new Prisma.Decimal(dto.initialQuantity),
                    minQuantity:
                        dto.minQuantity !== undefined
                            ? new Prisma.Decimal(dto.minQuantity)
                            : undefined,
                    imageUrl: dto.imageUrl,
                    thc: dto.thc !== undefined ? new Prisma.Decimal(dto.thc) : undefined,
                    cbd: dto.cbd !== undefined ? new Prisma.Decimal(dto.cbd) : undefined,
                    strain: dto.strain,
                    audiences: dto.audiences,
                    limitGramsPerUnit:
                        dto.limitGramsPerUnit != null
                            ? new Prisma.Decimal(dto.limitGramsPerUnit)
                            : undefined,
                    taxRateId: dto.taxRateId ?? null,
                    priceIncludesTax: dto.priceIncludesTax ?? null,
                    createdBy: employeeId,
                },
                (product) => productChangedEvents(portalId, product.id, "created", employeeId)
            )
            .catch(rethrowBarcodeTaken(barcode));
    }

    async update(
        id: string,
        dto: Partial<{
            categoryId: string;
            measurementUnitId: string;
            name: string;
            description: string | null;
            sku: string | null;
            barcode: string | null;
            isConsumable: boolean;
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
            audiences: ProductAudience[];
            limitGramsPerUnit: number | null;
            taxRateId: string | null;
            priceIncludesTax: boolean | null;
            /** Причина правки остатка (TASK-804): без неё остаток не меняется */
            stockNote: string;
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
        const barcode = dto.barcode !== undefined ? normalizeBarcode(dto.barcode) : undefined;
        if (barcode && barcode !== product.barcode) await this.assertBarcodeFree(portalId, barcode);
        if (dto.taxRateId && dto.taxRateId !== product.taxRateId) {
            await this.taxRates.usable(portalId, dto.taxRateId);
        }

        const data: Record<string, unknown> = { updatedBy: employeeId };
        if (dto.categoryId !== undefined) data.categoryId = dto.categoryId;
        if (dto.measurementUnitId !== undefined) data.measurementUnitId = dto.measurementUnitId;
        if (dto.name !== undefined) data.name = dto.name;
        if (dto.description !== undefined) data.description = dto.description;
        if (dto.sku !== undefined) data.sku = dto.sku;
        if (barcode !== undefined) data.barcode = barcode;
        if (dto.isConsumable !== undefined) data.isConsumable = dto.isConsumable;
        if (dto.price !== undefined) data.price = new Prisma.Decimal(dto.price);
        if (dto.initialQuantity !== undefined)
            data.initialQuantity = new Prisma.Decimal(dto.initialQuantity);
        if (dto.minQuantity !== undefined)
            data.minQuantity =
                dto.minQuantity !== null ? new Prisma.Decimal(dto.minQuantity) : null;
        if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl;
        if (dto.isActive !== undefined) data.isActive = dto.isActive;
        if (dto.isAvailable !== undefined) data.isAvailable = dto.isAvailable;
        if (dto.thc !== undefined) data.thc = dto.thc !== null ? new Prisma.Decimal(dto.thc) : null;
        if (dto.cbd !== undefined) data.cbd = dto.cbd !== null ? new Prisma.Decimal(dto.cbd) : null;
        if (dto.strain !== undefined) data.strain = dto.strain;
        if (dto.audiences !== undefined) data.audiences = dto.audiences;
        if (dto.limitGramsPerUnit !== undefined)
            data.limitGramsPerUnit =
                dto.limitGramsPerUnit !== null ? new Prisma.Decimal(dto.limitGramsPerUnit) : null;
        if (dto.taxRateId !== undefined) data.taxRateId = dto.taxRateId;
        if (dto.priceIncludesTax !== undefined) data.priceIncludesTax = dto.priceIncludesTax;

        // остаток правится только движением склада с причиной: журнал остаётся полным
        if (dto.currentQuantity !== undefined) {
            const delta = dto.currentQuantity - Number(product.currentQuantity);
            if (delta !== 0) {
                await this.stock.moveManually(portalId, employeeId, {
                    productId: id,
                    reason: "recount",
                    quantity: delta,
                    note: dto.stockNote ?? "",
                });
            }
        }
        return this.productRepository
            .update(
                id,
                data,
                productChangedEvents(portalId, id, "updated", employeeId, {
                    stockChanged: dto.isAvailable !== undefined,
                })
            )
            .catch(rethrowBarcodeTaken(barcode));
    }

    private async assertBarcodeFree(portalId: string, barcode: string): Promise<void> {
        if (await this.productRepository.findByBarcode(barcode, portalId)) {
            throw barcodeTaken(barcode);
        }
    }

    async delete(id: string, portalId: string, employeeId: string): Promise<void> {
        const product = await this.productRepository.findById(id, portalId);
        if (!product) {
            throw new NotFoundException("Product not found");
        }
        return this.productRepository.delete(
            id,
            productChangedEvents(portalId, id, "deleted", employeeId)
        );
    }
}
