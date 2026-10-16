import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiPaginatedResponse } from "@common/decorators/response/api-paginated-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { PaginationDto } from "@common/paginate/dto/pagination.dto";
import { PaginatedResult } from "@common/paginate/interfaces/paginated-result.interface";
import { PaginationUtil } from "@common/paginate/utils/pagination.util";
import { RequireMemberJwt } from "@modules/portal/auth/members";
import { CurrentMember } from "@modules/portal/auth/members/api/decorators/current-member.decorator";
import { Member } from "@modules/portal/crm/members/domain/entity/member.entity";
import {
    MyPresenceStatusDto,
    PresenceSessionDto,
} from "@modules/portal/crm/presence/api/dto/presence.dto";
import { mapPresenceSessionToDto } from "@modules/portal/crm/presence/api/mappers";
import { PresenceService } from "@modules/portal/crm/presence/application/services/presence.service";

/** Присутствие участника в клубе: свой статус и история визитов. */
@ApiTags("Cabinet Presence")
@Controller("cabinet/presence")
@RequireMemberJwt()
@ApiBearerAuth()
export class CabinetPresenceController {
    constructor(private readonly presenceService: PresenceService) {}

    // ─── Текущий статус (в клубе или нет) ────────────────────────────────────

    @Get("status")
    @ApiOperation({
        summary: "Мой текущий статус присутствия",
        description: "Возвращает true если участник сейчас в клубе (есть активная сессия).",
    })
    @ApiSuccessResponse(MyPresenceStatusDto)
    @ApiErrorResponse([401, 403])
    async getMyPresenceStatus(@CurrentMember() member: Member): Promise<MyPresenceStatusDto> {
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
