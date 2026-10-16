import {
    Body,
    Controller,
    ForbiddenException,
    Get,
    NotFoundException,
    Param,
    Post,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { ClubJoinPolicy, MemberConsentStatus, MemberJoinSource } from "@prisma/client";

import { CurrentAuthUser } from "@common/decorators/auth/current-auth-user.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { PrismaService } from "@common/prisma/prisma.service";
import { RequireUserJwt } from "@modules/portal/auth/members/api/decorators/require-member-jwt.decorator";
import type { AuthenticatedUser } from "@modules/portal/auth/shared/domain/auth-user";
import { ClubPolicyService } from "@modules/portal/crm/club-policy/application/services/club-policy.service";
import { JoinPortalService } from "@modules/portal/crm/members/application/services/join-portal.service";
import { PortalResolutionService } from "@modules/portal/crm/portals/application/services/portal-resolution.service";
import { PORTAL_SUMMARY_SELECT } from "@modules/portal/crm/portals/infrastructure/prisma-includes/portal-summary.select";

import {
    JoinPortalDto,
    JoinPortalResponseDto,
    MyClubsResponseDto,
} from "../dto/cabinet-portals.dto";

@ApiTags("Cabinet Portals (my clubs)")
@Controller("cabinet/portals")
export class CabinetPortalsController {
    constructor(
        private readonly prisma: PrismaService,
        private readonly portalResolution: PortalResolutionService,
        private readonly joinPortalService: JoinPortalService,
        private readonly policies: ClubPolicyService
    ) {}

    @Get()
    @RequireUserJwt()
    @ApiOperation({ summary: "Мои клубы (memberships текущего аккаунта)" })
    @ApiSuccessResponse(MyClubsResponseDto)
    @ApiErrorResponse([401])
    async myClubs(@CurrentAuthUser() user: AuthenticatedUser): Promise<MyClubsResponseDto> {
        const members = await this.prisma.member.findMany({
            // Членство, которое клуб завёл без согласия владельца, клубом ещё не считается
            where: { userId: user.userId, consentStatus: MemberConsentStatus.confirmed },
            include: { portal: { select: PORTAL_SUMMARY_SELECT } },
            orderBy: { createdAt: "desc" },
        });
        return {
            clubs: members.map((m) => ({
                portalId: m.portalId,
                slug: m.portal.name,
                displayName: m.portal.displayName,
                memberId: m.id,
                membershipNumber: m.membershipNumber ?? undefined,
                isActive: m.isActive,
                joinedAt: m.createdAt.toISOString(),
            })),
        };
    }

    @Post(":slug/join")
    @RequireUserJwt()
    @ApiOperation({
        summary:
            "Заявка в клуб без ссылки — только если клуб её принимает (joinPolicy=approval): участник " +
            "заводится в статусе «В работе», клуб одобряет его в CRM. Иначе 403 join_by_link_only",
    })
    @ApiSuccessResponse(JoinPortalResponseDto, { status: 201 })
    @ApiErrorResponse([400, 401, 404, 409])
    async join(
        @CurrentAuthUser() user: AuthenticatedUser,
        @Param("slug") slug: string,
        @Body() dto: JoinPortalDto
    ): Promise<JoinPortalResponseDto> {
        const portal = await this.portalResolution.findActiveByIdOrSlug(undefined, slug);
        if (!portal) {
            throw new NotFoundException("Portal not found");
        }
        // Решение владельца 2026-10-16: без ссылки — только с одобрения клуба, если он это включил
        const { joinPolicy } = await this.policies.get(portal.id);
        if (joinPolicy !== ClubJoinPolicy.approval) {
            throw new ForbiddenException({
                message: "This club accepts members only by its link",
                code: "join_by_link_only",
            });
        }
        const member = await this.joinPortalService.joinPortal({
            userId: user.userId,
            portalId: portal.id,
            fields: dto.fields ?? {},
            joinSource: MemberJoinSource.self,
            share: { documentIds: dto.shareDocumentIds, signature: dto.shareSignature },
        });
        return { memberId: member.id, portalId: portal.id };
    }
}
