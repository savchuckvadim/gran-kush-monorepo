import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { CurrentMember, RequireMemberJwt } from "@modules/portal/auth/members";
import { CrmMemberFullDto } from "@modules/portal/crm/members/api/dto/crm-member.dto";
import { MembersService } from "@modules/portal/crm/members/application/services/members.service";
import { Member } from "@modules/portal/crm/members/domain/entity/member.entity";

@ApiTags("Member Profile (LK - Site)")
@Controller("lk/members")
@RequireMemberJwt()
export class LkMembersController {
    constructor(private readonly membersService: MembersService) {}

    @Get("me")
    @ApiOperation({ summary: "Get current member profile (Site - own data only)" })
    @ApiSuccessResponse(CrmMemberFullDto, {
        description: "Current member details",
    })
    @ApiErrorResponse([401, 404])
    async getMe(@CurrentMember() member: Member): Promise<CrmMemberFullDto> {
        const fullMember = await this.membersService.findById(member.id);

        if (!fullMember) {
            throw new Error("Member not found");
        }

        return this.membersService.toCrmMemberFullDto(fullMember);
    }
}
