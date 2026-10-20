import { Body, Controller, Get, HttpCode, Post, Put, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentPrincipal } from "@common/decorators/auth/current-principal.decorator";
import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import type { PortalPrincipal } from "@common/portal";
import { CrmAuth } from "@modules/portal/auth/sessions/api/session-auth.decorators";

import { NotificationsService } from "../../application/notifications.service";
import type { NotificationRecipient } from "../../domain/notification";
import {
    MarkNotificationsReadDto,
    NotificationListDto,
    NotificationListQueryDto,
    NotificationPreferencesDto,
    UnreadNotificationsDto,
    UpdateNotificationPreferencesDto,
} from "../dto/notification.dto";
import { toNotificationDto } from "../notification.mapper";

const employee = (principal: PortalPrincipal): NotificationRecipient => ({
    kind: "employee",
    employeeId: principal.membershipId,
});

/** Колокольчик сотрудника: его уведомления в открытом клубе. Подписка клуба не нужна. */
@ApiTags("CRM Notifications")
@Controller("crm/notifications")
@CrmAuth({ subscription: false })
@ApiBearerAuth()
export class CrmNotificationsController {
    constructor(private readonly notifications: NotificationsService) {}

    @Get()
    @ApiOperation({ summary: "Мои уведомления в клубе: новые сверху, курсором" })
    @ApiSuccessResponse(NotificationListDto)
    @ApiErrorResponse([400, 401, 403])
    async list(
        @PortalId() portalId: string,
        @CurrentPrincipal() principal: PortalPrincipal,
        @Query() query: NotificationListQueryDto
    ): Promise<NotificationListDto> {
        const page = await this.notifications.list(portalId, employee(principal), query);
        return { ...page, items: page.items.map(toNotificationDto) };
    }

    @Get("unread-count")
    @ApiOperation({ summary: "Сколько непрочитанных — для значка колокольчика" })
    @ApiSuccessResponse(UnreadNotificationsDto)
    @ApiErrorResponse([401, 403])
    async unread(
        @PortalId() portalId: string,
        @CurrentPrincipal() principal: PortalPrincipal
    ): Promise<UnreadNotificationsDto> {
        return { unread: await this.notifications.unread(portalId, employee(principal)) };
    }

    @Post("read")
    @HttpCode(204)
    @ApiOperation({ summary: "Отметить прочитанными: перечисленные или все" })
    @ApiErrorResponse([400, 401, 403])
    async read(
        @PortalId() portalId: string,
        @CurrentPrincipal() principal: PortalPrincipal,
        @Body() dto: MarkNotificationsReadDto
    ): Promise<void> {
        await this.notifications.markRead(portalId, employee(principal), dto.ids ?? null);
    }

    @Get("preferences")
    @ApiOperation({ summary: "Каналы уведомлений аккаунта" })
    @ApiSuccessResponse(NotificationPreferencesDto)
    @ApiErrorResponse([401, 403])
    preferences(
        @CurrentPrincipal() principal: PortalPrincipal
    ): Promise<NotificationPreferencesDto> {
        return this.notifications.preferences(principal.userId);
    }

    @Put("preferences")
    @ApiOperation({ summary: "Включить или выключить уведомления в Telegram" })
    @ApiSuccessResponse(NotificationPreferencesDto)
    @ApiErrorResponse([400, 401, 403])
    setPreferences(
        @CurrentPrincipal() principal: PortalPrincipal,
        @Body() dto: UpdateNotificationPreferencesDto
    ): Promise<NotificationPreferencesDto> {
        return this.notifications.setTelegram(principal.userId, dto.telegram);
    }
}
