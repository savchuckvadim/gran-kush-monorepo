import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    NotFoundException,
    Param,
    Patch,
    Post,
    Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentPrincipal } from "@common/decorators/auth/current-principal.decorator";
import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import type { PortalPrincipal } from "@common/portal";
import { CrmAuth } from "@modules/portal/auth/sessions/api/session-auth.decorators";

import { CommentsService } from "../../application/comments.service";
import { TimelineService, type TimelineViewer } from "../../application/timeline.service";
import { isTimelineSubjectKind, type TimelineSubject } from "../../domain/timeline";
import {
    CreateCommentDto,
    TimelineCommentDto,
    TimelinePageDto,
    TimelineQueryDto,
    UpdateCommentDto,
} from "../dto/timeline.dto";
import { toCommentDto, toEntryDto } from "../timeline.mapper";

const viewerOf = (principal: PortalPrincipal): TimelineViewer => ({
    employeeId: principal.membershipId,
    permissions: principal.permissions,
});

const subjectOf = (kind: string, id: string): TimelineSubject => {
    if (!isTimelineSubjectKind(kind)) throw new NotFoundException("Timeline not found");
    return { kind, id };
};

/** Таймлайн карточек и комментарии персонала (TASK-782); права — в `TimelineService`. */
@ApiTags("CRM Timeline")
@Controller("crm")
@CrmAuth({ subscription: false })
@ApiBearerAuth()
export class CrmTimelineController {
    constructor(
        private readonly timeline: TimelineService,
        private readonly comments: CommentsService
    ) {}

    @Get("timeline/:kind/:id")
    @ApiOperation({
        summary: "Таймлайн сущности: события и комментарии, новые сверху",
        description: "kind: member | order | employee | product | portal (лента клуба, id — клуб)",
    })
    @ApiSuccessResponse(TimelinePageDto)
    @ApiErrorResponse([400, 401, 403, 404])
    async page(
        @PortalId() portalId: string,
        @CurrentPrincipal() principal: PortalPrincipal,
        @Param("kind") kind: string,
        @Param("id") id: string,
        @Query() query: TimelineQueryDto
    ): Promise<TimelinePageDto> {
        const page = await this.timeline.page(
            portalId,
            viewerOf(principal),
            subjectOf(kind, id),
            query
        );
        return {
            pinned: page.pinned.map(toCommentDto),
            entries: page.entries.map(toEntryDto),
            nextCursor: page.nextCursor,
        };
    }

    @Post("timeline/:kind/:id/comments")
    @ApiOperation({ summary: "Комментарий к сущности (видит только персонал)" })
    @ApiSuccessResponse(TimelineCommentDto, { status: 201 })
    @ApiErrorResponse([400, 401, 403, 404])
    async add(
        @PortalId() portalId: string,
        @CurrentPrincipal() principal: PortalPrincipal,
        @Param("kind") kind: string,
        @Param("id") id: string,
        @Body() dto: CreateCommentDto
    ): Promise<TimelineCommentDto> {
        return toCommentDto(
            await this.comments.add(portalId, viewerOf(principal), subjectOf(kind, id), dto.body)
        );
    }

    @Patch("comments/:id")
    @ApiOperation({ summary: "Править текст (автор) или закрепить и открепить" })
    @ApiSuccessResponse(TimelineCommentDto)
    @ApiErrorResponse([400, 401, 403, 404])
    async update(
        @PortalId() portalId: string,
        @CurrentPrincipal() principal: PortalPrincipal,
        @Param("id") id: string,
        @Body() dto: UpdateCommentDto
    ): Promise<TimelineCommentDto> {
        const viewer = viewerOf(principal);
        let comment =
            dto.body !== undefined
                ? await this.comments.edit(portalId, viewer, id, dto.body)
                : null;
        if (dto.pinned !== undefined)
            comment = await this.comments.pin(portalId, viewer, id, dto.pinned);
        if (!comment) throw new NotFoundException("Comment not found");
        return toCommentDto(comment);
    }

    @Delete("comments/:id")
    @HttpCode(204)
    @ApiOperation({ summary: "Удалить комментарий (автор или администратор клуба)" })
    @ApiErrorResponse([401, 403, 404])
    async remove(
        @PortalId() portalId: string,
        @CurrentPrincipal() principal: PortalPrincipal,
        @Param("id") id: string
    ): Promise<void> {
        await this.comments.remove(portalId, viewerOf(principal), id);
    }
}
