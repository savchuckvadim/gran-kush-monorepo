import { Controller, Get, NotFoundException } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { type ContentLocale, RequestLocale } from "@common/i18n";
import { CurrentMember, RequireMemberJwt } from "@modules/portal/auth/members";
import { CabinetMemberProfileDto } from "@modules/portal/crm/members/api/dto/cabinet-member-profile.dto";
import { toCabinetMemberProfile } from "@modules/portal/crm/members/api/mappers/cabinet-member-profile.mapper";
import { MembersService } from "@modules/portal/crm/members/application/services/members.service";
import { Member } from "@modules/portal/crm/members/domain/entity/member.entity";

@ApiTags("Cabinet Member Profile")
@Controller("cabinet/members")
@RequireMemberJwt()
export class CabinetMembersController {
    constructor(private readonly membersService: MembersService) {}

    @Get("me")
    @ApiOperation({
        summary: "Профиль участника в этом клубе — без заметок сотрудников и полей анкеты клуба",
    })
    @ApiSuccessResponse(CabinetMemberProfileDto, {
        description: "Current member details",
    })
    @ApiErrorResponse([401, 404])
    async getMe(
        @CurrentMember() member: Member,
        @RequestLocale() locale: ContentLocale
    ): Promise<CabinetMemberProfileDto> {
        const fullMember = await this.membersService.findByIdForPortal(member.id, member.portalId);

        if (!fullMember) {
            throw new NotFoundException("Member not found");
        }

        return toCabinetMemberProfile(
            await this.membersService.toCrmMemberFullDto(fullMember, locale)
        );
    }
}
