import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentMember } from "@auth/members/api/decorators/current-member.decorator";
import { MemberJwtAuthGuard } from "@auth/members/infrastructure/guards/member-jwt-auth.guard";
import { Member } from "@members/domain/entity/member.entity";
import { PresenceSessionDto } from "@presence/api/dto/presence.dto";
import { mapPresenceSessionToDto } from "@presence/api/mappers";
import { PresenceService } from "@presence/application/services/presence.service";

import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiPaginatedResponse } from "@common/decorators/response/api-paginated-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { PaginationDto } from "@common/paginate/dto/pagination.dto";
import { PaginatedResult } from "@common/paginate/interfaces/paginated-result.interface";
import { PaginationUtil } from "@common/paginate/utils/pagination.util";

// ═══════════════════════════════════════════════════════════════════════════════
// LK Presence Controller (Member — Личный кабинет)
// ═══════════════════════════════════════════════════════════════════════════════

@ApiTags("LK Presence (Site)")
@Controller("lk/presence")
@UseGuards(MemberJwtAuthGuard)
@ApiBearerAuth()
export class LkPresenceController {
    constructor(private readonly presenceService: PresenceService) {}

    // ─── Текущий статус (в клубе или нет) ────────────────────────────────────

    @Get("status")
    @ApiOperation({
        summary: "Мой текущий статус присутствия",
        description: "Возвращает true если участник сейчас в клубе (есть активная сессия).",
    })
    @ApiSuccessResponse(PresenceSessionDto)
    @ApiErrorResponse([401, 403])
    async getMyPresenceStatus(@CurrentMember() member: Member): Promise<{
        isPresent: boolean;
        currentSession: PresenceSessionDto | null;
    }> {
        const session = await this.presenceService.findActiveByMemberId(member.id);
        return {
            isPresent: session !== null,
            currentSession: session ? mapPresenceSessionToDto(session) : null,
        };
    }

    // ─── История моих посещений ──────────────────────────────────────────────

    @Get("history")
    @ApiOperation({
        summary: "Моя история посещений",
        description: "Список всех сессий присутствия текущего участника.",
    })
    @ApiPaginatedResponse(PresenceSessionDto, {
        description: "Paginated list of presence history",
    })
    @ApiErrorResponse([401, 403])
    async getMyPresenceHistory(
        @Query() pagination: PaginationDto,
        @CurrentMember() member: Member
    ): Promise<PaginatedResult<PresenceSessionDto>> {
        const page = pagination.page ?? 1;
        const limit = pagination.limit ?? 10;
        const skip = PaginationUtil.getSkip(page, limit);

        const [sessions, total] = await Promise.all([
            this.presenceService.findAll({ memberId: member.id }, limit, skip, "enteredAt", "desc"),
            this.presenceService.count({ memberId: member.id }),
        ]);

        const items = sessions.map(mapPresenceSessionToDto);
        return PaginationUtil.createPaginatedResult(items, total, page, limit);
    }
}
