import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { PortalTypeEnum } from "@prisma/client";
import { type BrandConfig, type BrandModuleCode, getBrand, hasBrandModule } from "@workspace/brand";

/**
 * The installation this process serves (`BRAND`: pafpaf, inkspace, plisplas). Each installation is
 * its own deployment with its own database, so the brand is fixed for the life of the process. An
 * unknown code stops the API at start.
 */
@Injectable()
export class BrandService {
    readonly brand: BrandConfig;

    constructor(config: ConfigService) {
        this.brand = getBrand(config.get<string>("BRAND")?.trim());
    }

    get code(): BrandConfig["code"] {
        return this.brand.code;
    }

    /** Kind of every portal this installation founds. */
    get portalType(): PortalTypeEnum {
        return PortalTypeEnum[this.brand.portalType];
    }

    has(module: BrandModuleCode): boolean {
        return hasBrandModule(this.brand, module);
    }
}
