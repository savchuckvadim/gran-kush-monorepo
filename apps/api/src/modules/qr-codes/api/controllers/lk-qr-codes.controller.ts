import { Controller, Get, NotFoundException, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentMember } from "@auth/members/api/decorators/current-member.decorator";
import { MemberJwtAuthGuard } from "@auth/members/infrastructure/guards/member-jwt-auth.guard";
import { Member } from "@members/domain/entity/member.entity";
import { QrCodeWithPayloadDto } from "@qr-codes/api/dto/qr-code.dto";
import { mapQrCodeToPayloadDto } from "@qr-codes/api/mappers";
import { QrCodesService } from "@qr-codes/application/services/qr-codes.service";

import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";

// ═══════════════════════════════════════════════════════════════════════════════
// LK QR Codes Controller (Member — Личный кабинет)
// ═══════════════════════════════════════════════════════════════════════════════

@ApiTags("LK QR Codes (Site)")
@Controller("lk/qr-code")
@UseGuards(MemberJwtAuthGuard)
@ApiBearerAuth()
export class LkQrCodesController {
    constructor(private readonly qrCodesService: QrCodesService) {}

    // ─── Получить свой QR-код ────────────────────────────────────────────────

    @Get()
    @ApiOperation({
        summary: "Получить свой QR-код",
        description:
            "Возвращает QR-код текущего участника с зашифрованным payload. " +
            "Payload нужно закодировать в QR-изображение на клиенте (qrcode.react).",
    })
    @ApiSuccessResponse(QrCodeWithPayloadDto)
    @ApiErrorResponse([401, 403, 404])
    async getMyQrCode(@CurrentMember() member: Member): Promise<QrCodeWithPayloadDto> {
        const qr = await this.qrCodesService.findByMemberId(member.id);
        if (!qr) {
            throw new NotFoundException(
                "QR-код не найден. Обратитесь к администратору для генерации."
            );
        }
        return mapQrCodeToPayloadDto(qr);
    }

    // ─── Запросить перегенерацию QR-кода ─────────────────────────────────────

    @Post("regenerate")
    @ApiOperation({
        summary: "Запросить перегенерацию QR-кода",
        description:
            "Перегенерирует QR-код текущего участника. " + "Старый QR-код перестанет работать.",
    })
    @ApiSuccessResponse(QrCodeWithPayloadDto)
    @ApiErrorResponse([400, 401, 403])
    async regenerateMyQrCode(@CurrentMember() member: Member): Promise<QrCodeWithPayloadDto> {
        const qr = await this.qrCodesService.generateOrRegenerate(member.id);
        return mapQrCodeToPayloadDto(qr);
    }
}
