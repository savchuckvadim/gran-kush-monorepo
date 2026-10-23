import {
    applyDecorators,
    CanActivate,
    ExecutionContext,
    Injectable,
    NotFoundException,
    SetMetadata,
    UseGuards,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import type { BrandModuleCode } from "@workspace/brand";

import { BrandService } from "./brand.service";

const BRAND_MODULE_KEY = "brand-module";

/**
 * Routes of a root feature the installation may not offer (presence, club policy, billing). Where
 * the brand lacks it the routes do not exist: 404, before the session guards, so a studio's API
 * looks the same to everyone whether signed in or not. Put it right above the class, under
 * `@CrmAuth()` / `@CabinetAuth()`: the guard then runs first.
 */
export const BrandModuleRoutes = (module: BrandModuleCode) =>
    applyDecorators(SetMetadata(BRAND_MODULE_KEY, module), UseGuards(BrandModuleGuard));

@Injectable()
export class BrandModuleGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly brand: BrandService
    ) {}

    canActivate(context: ExecutionContext): boolean {
        const module = this.reflector.getAllAndOverride<BrandModuleCode | undefined>(
            BRAND_MODULE_KEY,
            [context.getHandler(), context.getClass()]
        );
        if (module && !this.brand.has(module)) {
            throw new NotFoundException();
        }
        return true;
    }
}
