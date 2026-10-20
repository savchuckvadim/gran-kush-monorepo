import type { Prisma } from "@prisma/client";

import {
    CabinetProductCategoryDto,
    CabinetProductDto,
} from "@modules/portal/crm/catalog/api/dto/cabinet-product.dto";
import { Product } from "@modules/portal/crm/catalog/domain/entity/product.entity";
import { ProductCategory } from "@modules/portal/crm/catalog/domain/entity/product-category.entity";

const optionalNumber = (value: Prisma.Decimal | null | undefined): number | null =>
    value == null ? null : Number(value);

export const mapCategoryToCabinetDto = (c: ProductCategory): CabinetProductCategoryDto => ({
    id: c.id,
    name: c.name,
});

/** Налоговые поля товара для расчёта цены покупателя (`TaxPolicyService.grossPrices`). */
export const productPriceTaxInput = (p: Product) => ({
    id: p.id,
    price: Number(p.price),
    taxRateId: p.taxRateId ?? null,
    priceIncludesTax: p.priceIncludesTax ?? null,
});

/** `price` — цена для участника, с налогом; без неё — цена каталога. */
export function mapProductToCabinetDto(p: Product, price = Number(p.price)): CabinetProductDto {
    return {
        id: p.id,
        name: p.name,
        description: p.description ?? null,
        price,
        imageUrl: p.imageUrl ?? null,
        category: p.category ? mapCategoryToCabinetDto(p.category) : null,
        unit: p.measurementUnit
            ? { code: p.measurementUnit.code, name: p.measurementUnit.name }
            : null,
        inStock: Number(p.currentQuantity) > 0,
        thc: optionalNumber(p.thc),
        cbd: optionalNumber(p.cbd),
        strain: p.strain ?? null,
        limitGramsPerUnit: optionalNumber(p.limitGramsPerUnit),
    };
}
