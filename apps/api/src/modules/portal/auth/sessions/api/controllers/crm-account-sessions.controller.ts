import { Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentAuthUser } from "@common/decorators/auth/current-auth-user.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import type { AuthenticatedUser } from "@modules/portal/auth/shared/domain/auth-user";

import { AccountSessionsHandler } from "../account-sessions.handler";
import { AccountSessionsResponseDto, EndedSessionsResponseDto } from "../dto/account-session.dto";
import { CrmSession } from "../session-auth.decorators";

/** Устройства аккаунта из CRM (TASK-735); тот же список, что и в кабинете. */
@ApiTags("Account (sessions)")
@Controller("crm/account/sessions")
@CrmSession()
export class CrmAccountSessionsController {
    constructor(private readonly handler: AccountSessionsHandler) {}

    @Get()
    @ApiOperation({ summary: "Открытые сессии аккаунта в CRM и кабинете" })
    @ApiSuccessResponse(AccountSessionsResponseDto)
    @ApiErrorResponse([401])
    list(@CurrentAuthUser() user: AuthenticatedUser): Promise<AccountSessionsResponseDto> {
        return this.handler.list(user);
    }

    @Delete(":id")
    @HttpCode(204)
    @ApiOperation({
        summary: "Закрыть сессию на другом устройстве",
        description:
            "Текущая — 409 `current_session` (для неё есть выход), чужая или закрытая — 404.",
    })
    @ApiErrorResponse([400, 401, 404, 409])
    end(
        @CurrentAuthUser() user: AuthenticatedUser,
        @Param("id", ParseUUIDPipe) id: string
    ): Promise<void> {
        return this.handler.end(user, id);
    }

    @Post("sign-out-others")
    @HttpCode(200)
    @ApiOperation({ summary: "Выйти на всех остальных устройствах; эта сессия остаётся" })
    @ApiSuccessResponse(EndedSessionsResponseDto)
    @ApiErrorResponse([401])
    endOthers(@CurrentAuthUser() user: AuthenticatedUser): Promise<EndedSessionsResponseDto> {
        return this.handler.endOthers(user);
    }
}
