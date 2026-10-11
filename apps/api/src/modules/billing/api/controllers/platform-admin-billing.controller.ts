import {
    Body,
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { AdminBillingService } from "@modules/billing/application/services/admin-billing.service";
import { PlatformJwtAuthGuard } from "@modules/platform/auth/infrastructure/guards/platform-jwt-auth.guard";

import {
    AdminBillingPlanDto,
    AdminPortalSubscriptionDto,
    CreateBillingPlanDto,
    ManualPaymentDto,
    TrialEndDto,
    UpdateBillingPlanDto,
} from "../dto/admin-billing.dto";
import { BillingSubscriptionDto, toBillingSubscriptionDto } from "../dto/billing-subscription.dto";

@ApiTags("Platform — биллинг (админка)")
@Controller("platform/admin/billing")
@UseGuards(PlatformJwtAuthGuard)
@ApiBearerAuth()
export class PlatformAdminBillingController {
    constructor(private readonly billing: AdminBillingService) {}

    @Get("plans")
    @ApiOperation({ summary: "Все тарифы, включая скрытые и архивные" })
    @ApiSuccessResponse(AdminBillingPlanDto, { isArray: true })
    @ApiErrorResponse([401])
    listPlans(): Promise<AdminBillingPlanDto[]> {
        return this.billing.listPlans();
    }

    @Post("plans")
    @ApiOperation({
        summary: "Новый тариф",
        description:
            "С stripePriceId цена, валюта и период берутся из Stripe. Без него — тариф для ручной оплаты, нужен priceAmount.",
    })
    @ApiSuccessResponse(AdminBillingPlanDto, { status: 201 })
    @ApiErrorResponse([400, 401, 409, 503])
    createPlan(@Body() dto: CreateBillingPlanDto): Promise<AdminBillingPlanDto> {
        return this.billing.createPlan(dto);
    }

    @Patch("plans/:code")
    @ApiOperation({
        summary: "Изменить тариф",
        description:
            "Удаления нет: на тариф ссылаются подписки. Снять с продажи — isActive=false, скрыть с сайта — isPublic=false.",
    })
    @ApiSuccessResponse(AdminBillingPlanDto)
    @ApiErrorResponse([400, 401, 404, 503])
    updatePlan(
        @Param("code") code: string,
        @Body() dto: UpdateBillingPlanDto
    ): Promise<AdminBillingPlanDto> {
        return this.billing.updatePlan(code, dto);
    }

    @Get("subscriptions")
    @ApiOperation({ summary: "Клубы и их подписки" })
    @ApiSuccessResponse(AdminPortalSubscriptionDto, { isArray: true })
    @ApiErrorResponse([401])
    async listSubscriptions(): Promise<AdminPortalSubscriptionDto[]> {
        const rows = await this.billing.listSubscriptions();
        return rows.map((row) => ({
            portalId: row.portalId,
            portalName: row.portalName,
            portalDisplayName: row.portalDisplayName,
            portalCreatedAt: row.portalCreatedAt.toISOString(),
            subscription: row.subscription ? toBillingSubscriptionDto(row.subscription) : null,
        }));
    }

    @Post("subscriptions/:portalId/manual-payments")
    @ApiOperation({
        summary: "Отметить оплату вне Stripe",
        description:
            "Подписка становится active на указанное число месяцев (от конца оплаченного срока, если он ещё идёт).",
    })
    @ApiSuccessResponse(BillingSubscriptionDto, { status: 201 })
    @ApiErrorResponse([400, 401, 404, 409])
    async recordManualPayment(
        @Param("portalId", ParseUUIDPipe) portalId: string,
        @Body() dto: ManualPaymentDto
    ): Promise<BillingSubscriptionDto> {
        return toBillingSubscriptionDto(await this.billing.recordManualPayment(portalId, dto));
    }

    @Patch("subscriptions/:portalId/trial")
    @ApiOperation({ summary: "Изменить конец бесплатного периода клуба" })
    @ApiSuccessResponse(BillingSubscriptionDto)
    @ApiErrorResponse([400, 401, 404, 409])
    async setTrialEnd(
        @Param("portalId", ParseUUIDPipe) portalId: string,
        @Body() dto: TrialEndDto
    ): Promise<BillingSubscriptionDto> {
        return toBillingSubscriptionDto(
            await this.billing.setTrialEnd(portalId, new Date(dto.trialEndsAt))
        );
    }
}
