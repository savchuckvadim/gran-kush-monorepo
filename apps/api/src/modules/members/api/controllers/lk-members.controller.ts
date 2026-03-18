import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentMember } from "@auth/members";
import { MemberJwtAuthGuard } from "@auth/members";
import { CrmMemberFullDto } from "@members/api/dto/crm-member.dto";
import { MembersService } from "@members/application/services/members.service";
import { Member } from "@members/domain/entity/member.entity";

import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";

@ApiTags("Member Profile (LK - Site)")
@Controller("lk/members")
@UseGuards(MemberJwtAuthGuard)
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

        return {
            id: fullMember.id,
            userId: fullMember.userId,
            email: fullMember.user.email,
            name: fullMember.name,
            surname: fullMember.surname,
            phone: fullMember.phone,
            birthday: fullMember.birthday?.toISOString() ?? null,
            status: fullMember.status,
            isActive: fullMember.isActive,
            emailConfirmed: false,
            address: fullMember.address,
            membershipNumber: fullMember.membershipNumber,
            notes: fullMember.notes,
            createdAt: fullMember.createdAt.toISOString(),
            updatedAt: fullMember.updatedAt.toISOString(),
            identityDocuments: fullMember.identityDocuments.map((doc) => ({
                id: doc.id,
                type: doc.type,
                side: doc.side,
                storagePath: doc.storagePath,
                createdAt: doc.createdAt.toISOString(),
            })),
            signature: fullMember.signature
                ? {
                      id: fullMember.signature.id,
                      storagePath: fullMember.signature.storagePath,
                      createdAt: fullMember.signature.createdAt.toISOString(),
                  }
                : null,
            mjStatuses: fullMember.memberMjStatuses.map((item) => ({
                id: item.mjStatus.id,
                code: item.mjStatus.code,
                name: item.mjStatus.name,
            })),
            documents: fullMember.memberDocuments.map((item) => ({
                id: item.document.id,
                type: item.document.type,
                name: item.document.name,
                number: item.number,
                createdAt: item.createdAt.toISOString(),
            })),
        };
    }
}
