import { Body, Controller, Get, HttpCode, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { DEFAULT_LANGUAGE } from "@mail/consts/mail.constants";

import { BrandModuleRoutes } from "@common/brand/brand-module.guard";
import { CurrentEmployee } from "@common/decorators/auth/current-employee.decorator";
import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { RequirePermission } from "@common/decorators/auth/require-permission.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { PortalBillingService } from "@modules/billing/application/services/portal-billing.service";
import { CrmAuth } from "@modules/portal/auth/sessions/api/session-auth.decorators";
import { PERMISSIONS } from "@modules/portal/crm/access/domain/permissions";
import { Employee } from "@modules/portal/crm/employees/domain/entity/employee.entity";

import { toBillingSubscriptionDto } from "../dto/billing-subscription.dto";
import {
    BillingRedirectDto,
    CrmBillingCheckoutDto,
    CrmBillingManageDto,
    CrmBillingOverviewDto,
    CrmBillingQueryDto,
} from "../dto/crm-billing.dto";

@ApiTags("CRM Billing")
@Controller("crm/billing")
// Без subscription gate: оплатить нужно именно тогда, когда CRM уже закрыта 402
@CrmAuth({ subscription: false })
@ApiBearerAuth()
@BrandModuleRoutes("billing")
export class CrmBillingController {
    constructor(private readonly billing: PortalBillingService) {}

    @Get()
    @RequirePermission(PERMISSIONS.BillingManage)
    @ApiOperation({ summary: "Подписка клуба и тарифы, которые можно оплатить" })
    @ApiSuccessResponse(CrmBillingOverviewDto)
    @ApiErrorResponse([400, 401, 403, 404])
    async getOverview(
        @PortalId() portalId: string,
        @Query() query: CrmBillingQueryDto
    ): Promise<CrmBillingOverviewDto> {
        const overview = await this.billing.getOverview(portalId, query.plan);
        return {
            subscription: toBillingSubscriptionDto(overview.subscription),
            paymentsEnabled: overview.paymentsEnabled,
            canManage: overview.canManage,
            plans: overview.plans,
        };
    }

    @Post("checkout")
    @HttpCode(200)
    @RequirePermission(PERMISSIONS.BillingManage)
    @ApiOperation({
        summary: "Страница оплаты Stripe для выбранного тарифа",
        description:
            "Ответ — адрес Stripe Checkout. После оплаты Stripe вернёт на страницу подписки.",
    })
    @ApiSuccessResponse(BillingRedirectDto)
    @ApiErrorResponse([400, 401, 403, 404, 409, 503])
    async checkout(
        @PortalId() portalId: string,
        @CurrentEmployee() employee: Employee,
        @Body() dto: CrmBillingCheckoutDto
    ): Promise<BillingRedirectDto> {
        return this.billing.startCheckout(portalId, {
            planCode: dto.planCode,
            customerEmail: employee.email,
            locale: dto.locale ?? DEFAULT_LANGUAGE,
        });
    }

    @Post("manage")
    @HttpCode(200)
    @RequirePermission(PERMISSIONS.BillingManage)
    @ApiOperation({ summary: "Кабинет Stripe: карта, смена тарифа, отмена, счета" })
    @ApiSuccessResponse(BillingRedirectDto)
    @ApiErrorResponse([400, 401, 403, 404, 503])
    async manage(
        @PortalId() portalId: string,
        @Body() dto: CrmBillingManageDto
    ): Promise<BillingRedirectDto> {
        return this.billing.openManagement(portalId, dto.locale ?? DEFAULT_LANGUAGE);
    }
}
