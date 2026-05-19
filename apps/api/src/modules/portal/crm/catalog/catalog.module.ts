import { Module } from "@nestjs/common";

import { PrismaModule } from "@common/prisma/prisma.module";
import { CrmCatalogController } from "@modules/portal/crm/catalog/api/controllers/crm-catalog.controller";
import { LkCatalogController } from "@modules/portal/crm/catalog/api/controllers/lk-catalog.controller";
import { MeasurementUnitsService } from "@modules/portal/crm/catalog/application/services/measurement-units.service";
import { ProductCategoriesService } from "@modules/portal/crm/catalog/application/services/product-categories.service";
import { ProductsService } from "@modules/portal/crm/catalog/application/services/products.service";
import { MeasurementUnitRepository } from "@modules/portal/crm/catalog/domain/repositories/measurement-unit-repository.interface";
import { ProductCategoryRepository } from "@modules/portal/crm/catalog/domain/repositories/product-category-repository.interface";
import { ProductRepository } from "@modules/portal/crm/catalog/domain/repositories/product-repository.interface";
import { MeasurementUnitPrismaRepository } from "@modules/portal/crm/catalog/infrastructure/repositories/measurement-unit-prisma.repository";
import { ProductCategoryPrismaRepository } from "@modules/portal/crm/catalog/infrastructure/repositories/product-category-prisma.repository";
import { ProductPrismaRepository } from "@modules/portal/crm/catalog/infrastructure/repositories/product-prisma.repository";

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
