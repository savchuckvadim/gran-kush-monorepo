import { Body, Controller, Get, HttpCode, Post, Put, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import type { Member } from "@prisma/client";

import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { CurrentMember } from "@modules/portal/auth/members";
import { CabinetAuth } from "@modules/portal/auth/sessions/api/session-auth.decorators";

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

const memberOf = (member: Member): NotificationRecipient => ({
    kind: "member",
    memberId: member.id,
});

/** Колокольчик участника: его уведомления в клубе, который открыт в кабинете. */
@ApiTags("Cabinet Notifications")
@Controller("cabinet/notifications")
@CabinetAuth()
@ApiBearerAuth()
export class CabinetNotificationsController {
    constructor(private readonly notifications: NotificationsService) {}

    @Get()
    @ApiOperation({ summary: "Мои уведомления в клубе: новые сверху, курсором" })
    @ApiSuccessResponse(NotificationListDto)
    @ApiErrorResponse([400, 401, 403])
    async list(
        @CurrentMember() member: Member,
        @Query() query: NotificationListQueryDto
    ): Promise<NotificationListDto> {
        const page = await this.notifications.list(member.portalId, memberOf(member), query);
        return { ...page, items: page.items.map(toNotificationDto) };
    }

    @Get("unread-count")
    @ApiOperation({ summary: "Сколько непрочитанных — для значка колокольчика" })
    @ApiSuccessResponse(UnreadNotificationsDto)
    @ApiErrorResponse([401, 403])
    async unread(@CurrentMember() member: Member): Promise<UnreadNotificationsDto> {
        return { unread: await this.notifications.unread(member.portalId, memberOf(member)) };
    }

    @Post("read")
    @HttpCode(204)
    @ApiOperation({ summary: "Отметить прочитанными: перечисленные или все" })
    @ApiErrorResponse([400, 401, 403])
    async read(
        @CurrentMember() member: Member,
        @Body() dto: MarkNotificationsReadDto
    ): Promise<void> {
        await this.notifications.markRead(member.portalId, memberOf(member), dto.ids ?? null);
    }

    @Get("preferences")
    @ApiOperation({ summary: "Каналы уведомлений аккаунта" })
    @ApiSuccessResponse(NotificationPreferencesDto)
    @ApiErrorResponse([401, 403])
    preferences(@CurrentMember() member: Member): Promise<NotificationPreferencesDto> {
        return this.notifications.preferences(member.userId);
    }

    @Put("preferences")
    @ApiOperation({ summary: "Включить или выключить уведомления в Telegram" })
    @ApiSuccessResponse(NotificationPreferencesDto)
    @ApiErrorResponse([400, 401, 403])
    setPreferences(
        @CurrentMember() member: Member,
        @Body() dto: UpdateNotificationPreferencesDto
    ): Promise<NotificationPreferencesDto> {
        return this.notifications.setTelegram(member.userId, dto.telegram);
    }
}
