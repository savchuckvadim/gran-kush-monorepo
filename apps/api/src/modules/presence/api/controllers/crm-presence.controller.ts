import { Body, Controller, Get, NotFoundException, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { RequireEmployeeJwt } from "@auth/employees";
import { CurrentEmployee } from "@auth/employees/api/decorators/current-employee.decorator";
import { Employee } from "@employees/domain/entity/employee.entity";
import {
    CheckInResultDto,
    ManualCheckInDto,
    ManualCheckOutDto,
    PresenceFilterDto,
    PresenceSessionDto,
    PresenceStatsDto,
    PresenceStatsQueryDto,
    QrCheckInDto,
    QrPreviewResultDto,
} from "@presence/api/dto/presence.dto";
import { mapPresenceSessionToDto } from "@presence/api/mappers";
import { PresenceService } from "@presence/application/services/presence.service";

import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiPaginatedResponse } from "@common/decorators/response/api-paginated-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { PaginationDto } from "@common/paginate/dto/pagination.dto";
import { PaginatedResult } from "@common/paginate/interfaces/paginated-result.interface";
import { PaginationUtil } from "@common/paginate/utils/pagination.util";

// ═══════════════════════════════════════════════════════════════════════════════
// CRM Presence Controller
// ═══════════════════════════════════════════════════════════════════════════════

@ApiTags("CRM Presence")
@Controller("crm/presence")
@RequireEmployeeJwt()
@ApiBearerAuth()
export class CrmPresenceController {
    constructor(private readonly presenceService: PresenceService) {}

    // ─── QR Check-in/out (Toggle) ────────────────────────────────────────────

    @Post("qr-scan")
    @ApiOperation({
        summary: "Сканирование QR на стойке (вход/выход)",
        description:
            "Если участник не в клубе — регистрирует вход. " +
            "Если уже в клубе — регистрирует выход.",
    })
    @ApiSuccessResponse(CheckInResultDto)
    @ApiErrorResponse([400, 401, 403])
    async qrScan(@Body() dto: QrCheckInDto): Promise<CheckInResultDto> {
        const result = await this.presenceService.handleQrScan(dto.encryptedCode);
        return {
            action: result.action,
            session: mapPresenceSessionToDto(result.session),
            message:
                result.action === "entry"
                    ? "Участник отмечен на вход"
                    : "Участник отмечен на выход",
        };
    }

    // ─── QR Preview (без записи) ─────────────────────────────────────────────

    @Post("qr-preview")
    @ApiOperation({
        summary: "Предпросмотр QR-кода (без записи присутствия)",
        description:
            "Валидирует QR-код и возвращает информацию об участнике + " +
            "предлагаемое действие (вход/выход). Запись в БД не выполняется.",
    })
    @ApiSuccessResponse(QrPreviewResultDto)
    @ApiErrorResponse([400, 401, 403])
    async previewQrScan(@Body() dto: QrCheckInDto): Promise<QrPreviewResultDto> {
        return this.presenceService.previewQrScan(dto.encryptedCode);
    }

    // ─── Manual Check-in ─────────────────────────────────────────────────────

    @Post("manual/check-in")
    @ApiOperation({ summary: "Ручной чек-ин участника (сотрудником)" })
    @ApiSuccessResponse(PresenceSessionDto, { status: 201 })
    @ApiErrorResponse([400, 401, 403, 404])
    async manualCheckIn(
        @Body() dto: ManualCheckInDto,
        @CurrentEmployee() employee: Employee
    ): Promise<PresenceSessionDto> {
        const session = await this.presenceService.manualCheckIn(dto.memberId, employee.id);
        return mapPresenceSessionToDto(session);
    }

    // ─── Manual Check-out ────────────────────────────────────────────────────

    @Post("manual/check-out")
    @ApiOperation({ summary: "Ручной чек-аут участника (сотрудником)" })
    @ApiSuccessResponse(PresenceSessionDto)
    @ApiErrorResponse([400, 401, 403])
    async manualCheckOut(
        @Body() dto: ManualCheckOutDto,
        @CurrentEmployee() employee: Employee
    ): Promise<PresenceSessionDto> {
        const session = await this.presenceService.manualCheckOut(dto.memberId, employee.id);
        return mapPresenceSessionToDto(session);
    }

    // ─── Список сессий ───────────────────────────────────────────────────────

    @Get("sessions")
    @ApiOperation({ summary: "Список сессий присутствия (с фильтрами)" })
    @ApiPaginatedResponse(PresenceSessionDto, {
        description: "Paginated list of presence sessions",
    })
    @ApiErrorResponse([401, 403])
    async listSessions(
        @Query() pagination: PaginationDto,
        @Query() filters: PresenceFilterDto
    ): Promise<PaginatedResult<PresenceSessionDto>> {
        const page = pagination.page ?? 1;
        const limit = pagination.limit ?? 10;
        const skip = PaginationUtil.getSkip(page, limit);

        const [sessions, total] = await Promise.all([
            this.presenceService.findAll(
                filters,
                limit,
                skip,
                pagination.sortBy,
                pagination.sortOrder
            ),
            this.presenceService.count(filters),
        ]);

        const items = sessions.map(mapPresenceSessionToDto);
        return PaginationUtil.createPaginatedResult(items, total, page, limit);
    }

    // ─── Детали сессии ───────────────────────────────────────────────────────

    @Get("sessions/:id")
    @ApiOperation({ summary: "Детали сессии присутствия" })
    @ApiSuccessResponse(PresenceSessionDto)
    @ApiErrorResponse([401, 403, 404])
    async getSession(@Param("id") id: string): Promise<PresenceSessionDto> {
        const session = await this.presenceService.findById(id);
        if (!session) {
            throw new NotFoundException("Сессия не найдена");
        }
        return mapPresenceSessionToDto(session);
    }

    // ─── Текущие присутствующие ──────────────────────────────────────────────

    @Get("currently-present")
    @ApiOperation({
        summary: "Список текущих присутствующих",
        description: "Все участники, которые сейчас находятся в клубе.",
    })
    @ApiSuccessResponse(PresenceSessionDto, { isArray: true })
    @ApiErrorResponse([401, 403])
    async getCurrentlyPresent(): Promise<PresenceSessionDto[]> {
        const sessions = await this.presenceService.findAll(
            { isActive: true },
            100, // max 100
            0,
            "enteredAt",
            "asc"
        );
        return sessions.map(mapPresenceSessionToDto);
    }

    // ─── Статистика ──────────────────────────────────────────────────────────

    @Get("stats")
    @ApiOperation({ summary: "Статистика присутствия" })
    @ApiSuccessResponse(PresenceStatsDto)
    @ApiErrorResponse([401, 403])
    async getStats(@Query() query: PresenceStatsQueryDto): Promise<PresenceStatsDto> {
        return this.presenceService.getStats(query.startDate, query.endDate, query.memberId);
    }
}
