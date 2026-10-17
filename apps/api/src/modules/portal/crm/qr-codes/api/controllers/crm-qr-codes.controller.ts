import { Body, Controller, Delete, Get, NotFoundException, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { RequirePermission } from "@common/decorators/auth/require-permission.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { RequireEmployeeJwt } from "@modules/portal/auth/employees";
import { PERMISSIONS } from "@modules/portal/crm/access/domain/permissions";
import {
    QrCodeScanResultDto,
    QrCodeWithPayloadDto,
    RegenerateQrCodeDto,
    ScanQrCodeDto,
} from "@modules/portal/crm/qr-codes/api/dto/qr-code.dto";
import { mapQrCodeToPayloadDto } from "@modules/portal/crm/qr-codes/api/mappers";
import { QrCodesService } from "@modules/portal/crm/qr-codes/application/services/qr-codes.service";

// ═══════════════════════════════════════════════════════════════════════════════
// CRM QR Codes Controller
// ═══════════════════════════════════════════════════════════════════════════════

@ApiTags("CRM QR Codes")
@Controller("crm/qr-codes")
@RequireEmployeeJwt()
@ApiBearerAuth()
export class CrmQrCodesController {
    constructor(private readonly qrCodesService: QrCodesService) {}

    // ─── Сканирование QR-кода (на стойке) ────────────────────────────────────

    @Post("scan")
    @RequirePermission(PERMISSIONS.PresenceCheckin)
    @ApiOperation({
        summary: "Сканировать QR-код",
        description:
            "Валидация QR-кода при сканировании на стойке. " +
            "Возвращает информацию об участнике или ошибку.",
    })
    @ApiSuccessResponse(QrCodeScanResultDto)
    @ApiErrorResponse([400, 401, 403])
    async scanQrCode(
        @Body() dto: ScanQrCodeDto,
        @PortalId() portalId: string
    ): Promise<QrCodeScanResultDto> {
        return this.qrCodesService.validateScannedCode(dto.code, portalId);
    }

    // ─── Получить QR-код участника ───────────────────────────────────────────

    @Get("member/:memberId")
    @RequirePermission(PERMISSIONS.MembersRead)
    @ApiOperation({
        summary: "Получить QR-код участника",
        description:
            "С кодом для изображения: сотрудник печатает его участнику без телефона. Отметить " +
            "участника сотрудник может и вручную, поэтому код не даёт ему новых прав.",
    })
    @ApiSuccessResponse(QrCodeWithPayloadDto)
    @ApiErrorResponse([401, 403, 404])
    async getByMemberId(
        @Param("memberId") memberId: string,
        @PortalId() portalId: string
    ): Promise<QrCodeWithPayloadDto> {
        const qr = await this.qrCodesService.findByMemberId(memberId, portalId);
        if (!qr) {
            throw new NotFoundException("QR-код для этого участника не найден");
        }
        return mapQrCodeToPayloadDto(qr, this.qrCodesService.codeOf(qr));
    }

    // ─── Сгенерировать / перегенерировать QR-код ─────────────────────────────

    @Post("generate")
    @RequirePermission(PERMISSIONS.QrManage)
    @ApiOperation({
        summary: "Сгенерировать / перегенерировать QR-код для участника",
        description:
            "Если у участника уже есть QR-код, он будет перегенерирован. " +
            "Если нет — создан новый.",
    })
    @ApiSuccessResponse(QrCodeWithPayloadDto, { status: 201 })
    @ApiErrorResponse([400, 401, 403, 404])
    async generateQrCode(
        @Body() dto: RegenerateQrCodeDto,
        @PortalId() portalId: string
    ): Promise<QrCodeWithPayloadDto> {
        const qr = await this.qrCodesService.generateOrRegenerate(dto.memberId, portalId);
        return mapQrCodeToPayloadDto(qr, this.qrCodesService.codeOf(qr));
    }

    // ─── Отозвать QR-код ─────────────────────────────────────────────────────

    @Delete("member/:memberId")
    @RequirePermission(PERMISSIONS.QrManage)
    @ApiOperation({
        summary: "Отозвать QR-код участника",
        description:
            "Удаляет QR-код участника: прежний код (в телефоне, на распечатке) больше не принимается. " +
            "Кабинет выдаст участнику новый, когда он его откроет.",
    })
    @ApiErrorResponse([401, 403, 404])
    async revokeQrCode(
        @Param("memberId") memberId: string,
        @PortalId() portalId: string
    ): Promise<{ message: string }> {
        await this.qrCodesService.revokeByMemberId(memberId, portalId);
        return { message: "QR-код успешно отозван" };
    }
}
