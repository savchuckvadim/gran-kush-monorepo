import {
    Body,
    Controller,
    Delete,
    Get,
    NotFoundException,
    Param,
    Post,
    UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { EmployeeJwtAuthGuard } from "@auth/employees/infrastructure/guards/employee-jwt-auth.guard";
import {
    QrCodeDto,
    QrCodeScanResultDto,
    RegenerateQrCodeDto,
    ScanQrCodeDto,
} from "@qr-codes/api/dto/qr-code.dto";
import { mapQrCodeToDto } from "@qr-codes/api/mappers";
import { QrCodesService } from "@qr-codes/application/services/qr-codes.service";

import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";

// ═══════════════════════════════════════════════════════════════════════════════
// CRM QR Codes Controller
// ═══════════════════════════════════════════════════════════════════════════════

@ApiTags("CRM QR Codes")
@Controller("crm/qr-codes")
@UseGuards(EmployeeJwtAuthGuard)
@ApiBearerAuth()
export class CrmQrCodesController {
    constructor(private readonly qrCodesService: QrCodesService) {}

    // ─── Сканирование QR-кода (на стойке) ────────────────────────────────────

    @Post("scan")
    @ApiOperation({
        summary: "Сканировать QR-код",
        description:
            "Валидация QR-кода при сканировании на стойке. " +
            "Возвращает информацию об участнике или ошибку.",
    })
    @ApiSuccessResponse(QrCodeScanResultDto)
    @ApiErrorResponse([400, 401, 403])
    async scanQrCode(@Body() dto: ScanQrCodeDto): Promise<QrCodeScanResultDto> {
        return this.qrCodesService.validateScannedCode(dto.encryptedCode);
    }

    // ─── Получить QR-код участника ───────────────────────────────────────────

    @Get("member/:memberId")
    @ApiOperation({ summary: "Получить QR-код участника" })
    @ApiSuccessResponse(QrCodeDto)
    @ApiErrorResponse([401, 403, 404])
    async getByMemberId(@Param("memberId") memberId: string): Promise<QrCodeDto> {
        const qr = await this.qrCodesService.findByMemberId(memberId);
        if (!qr) {
            throw new NotFoundException("QR-код для этого участника не найден");
        }
        return mapQrCodeToDto(qr);
    }

    // ─── Сгенерировать / перегенерировать QR-код ─────────────────────────────

    @Post("generate")
    @ApiOperation({
        summary: "Сгенерировать / перегенерировать QR-код для участника",
        description:
            "Если у участника уже есть QR-код, он будет перегенерирован. " +
            "Если нет — создан новый.",
    })
    @ApiSuccessResponse(QrCodeDto, { status: 201 })
    @ApiErrorResponse([400, 401, 403, 404])
    async generateQrCode(@Body() dto: RegenerateQrCodeDto): Promise<QrCodeDto> {
        const qr = await this.qrCodesService.generateOrRegenerate(dto.memberId);
        return mapQrCodeToDto(qr);
    }

    // ─── Отозвать QR-код ─────────────────────────────────────────────────────

    @Delete("member/:memberId")
    @ApiOperation({
        summary: "Отозвать QR-код участника",
        description: "Удаляет QR-код участника. После этого он не сможет входить по QR.",
    })
    @ApiErrorResponse([401, 403, 404])
    async revokeQrCode(@Param("memberId") memberId: string): Promise<{ message: string }> {
        await this.qrCodesService.revokeByMemberId(memberId);
        return { message: "QR-код успешно отозван" };
    }
}
