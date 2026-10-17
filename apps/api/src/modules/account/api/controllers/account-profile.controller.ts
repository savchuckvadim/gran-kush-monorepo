import { Body, Controller, Get, Put } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentAuthUser } from "@common/decorators/auth/current-auth-user.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import {
    AccountProfileDto,
    SaveAccountProfileDto,
} from "@modules/account/api/dto/account-profile.dto";
import { AccountProfileService } from "@modules/account/application/services/account-profile.service";
import {
    type AccountProfile,
    profileToMemberFields,
} from "@modules/account/domain/account-profile";
import { CabinetSession } from "@modules/portal/auth/sessions/api/session-auth.decorators";
import type { AuthenticatedUser } from "@modules/portal/auth/shared/domain/auth-user";

const toDto = (profile: AccountProfile): AccountProfileDto => ({
    ...profile,
    memberFields: profileToMemberFields(profile),
});

/** Профиль аккаунта в кабинете: ФИО, дата рождения, телефон, адрес — для анкет новых клубов. */
@ApiTags("Account (profile)")
@Controller("cabinet/account/profile")
@CabinetSession()
export class AccountProfileController {
    constructor(private readonly profiles: AccountProfileService) {}

    @Get()
    @ApiOperation({ summary: "Мой профиль; не заполненный — все поля null" })
    @ApiSuccessResponse(AccountProfileDto)
    @ApiErrorResponse([401])
    async get(@CurrentAuthUser() user: AuthenticatedUser): Promise<AccountProfileDto> {
        return toDto(await this.profiles.get(user.userId));
    }

    @Put()
    @ApiOperation({
        summary: "Сохранить профиль целиком",
        description: "Анкеты клубов, где человек уже состоит, не меняются: запись клуба — своя.",
    })
    @ApiSuccessResponse(AccountProfileDto)
    @ApiErrorResponse([400, 401])
    async save(
        @CurrentAuthUser() user: AuthenticatedUser,
        @Body() dto: SaveAccountProfileDto
    ): Promise<AccountProfileDto> {
        return toDto(await this.profiles.save(user.userId, dto));
    }
}
