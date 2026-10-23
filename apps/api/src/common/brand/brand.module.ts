import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { BrandService } from "./brand.service";
import { BrandModuleGuard } from "./brand-module.guard";

/** Global: founding, billing, mail, health and route guards all ask the same brand. */
@Global()
@Module({
    imports: [ConfigModule],
    providers: [BrandService, BrandModuleGuard],
    exports: [BrandService, BrandModuleGuard],
})
export class BrandModule {}
