import { Module } from "@nestjs/common";

import { CrmCatalogController } from "@catalog/api/controllers/crm-catalog.controller";
import { LkCatalogController } from "@catalog/api/controllers/lk-catalog.controller";
import { MeasurementUnitsService } from "@catalog/application/services/measurement-units.service";
import { ProductCategoriesService } from "@catalog/application/services/product-categories.service";
import { ProductsService } from "@catalog/application/services/products.service";
import { MeasurementUnitRepository } from "@catalog/domain/repositories/measurement-unit-repository.interface";
import { ProductCategoryRepository } from "@catalog/domain/repositories/product-category-repository.interface";
import { ProductRepository } from "@catalog/domain/repositories/product-repository.interface";
import { MeasurementUnitPrismaRepository } from "@catalog/infrastructure/repositories/measurement-unit-prisma.repository";
import { ProductCategoryPrismaRepository } from "@catalog/infrastructure/repositories/product-category-prisma.repository";
import { ProductPrismaRepository } from "@catalog/infrastructure/repositories/product-prisma.repository";

import { PrismaModule } from "@common/prisma/prisma.module";

@Module({
    imports: [PrismaModule],
    providers: [
        // Services
        ProductsService,
        ProductCategoriesService,
        MeasurementUnitsService,
        // Repositories
        {
            provide: ProductRepository,
            useClass: ProductPrismaRepository,
        },
        {
            provide: ProductCategoryRepository,
            useClass: ProductCategoryPrismaRepository,
        },
        {
            provide: MeasurementUnitRepository,
            useClass: MeasurementUnitPrismaRepository,
        },
    ],
    controllers: [CrmCatalogController, LkCatalogController],
    exports: [ProductsService, ProductCategoriesService, MeasurementUnitsService],
})
export class CatalogModule {}
