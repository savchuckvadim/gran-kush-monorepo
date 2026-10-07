import { Controller, Get, Res } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

import type { Response } from "express";

import { Public } from "@common/decorators/auth/public.decorator";
import { BillingPlansService } from "@modules/billing/application/services/billing-plans.service";

import { BillingPlanCatalogResponseDto } from "../dto/billing-plan-catalog.dto";

const CATALOG_CACHE_CONTROL = "public, max-age=300";

@ApiTags("Platform — тарифы")
@Controller("platform/billing")
@Public()
export class PlatformBillingPlansController {
    constructor(private readonly billingPlans: BillingPlansService) {}

    @Get("plans")
    @ApiOperation({
        summary: "Активные тарифы платформы для сайта продукта",
        description:
            "Публичный: без авторизации и без заголовков портала (`/platform/*` не проходит через PortalContextMiddleware).",
    })
    @ApiOkResponse({
        type: BillingPlanCatalogResponseDto,
        description: "Каталог тарифов",
        headers: {
            "Cache-Control": {
                description: "Каталог одинаков для всех — его можно держать в общих кэшах",
                schema: { type: "string", example: CATALOG_CACHE_CONTROL },
            },
        },
    })
    async listPlans(
        @Res({ passthrough: true }) res: Response
    ): Promise<BillingPlanCatalogResponseDto> {
        const plans = await this.billingPlans.listCatalog();
        // Не через @Header(): тот выставляется до вызова обработчика и попал бы и на 500,
        // а общий кэш продержал бы ошибку пять минут.
        res.setHeader("Cache-Control", CATALOG_CACHE_CONTROL);
        return { plans };
    }
}
