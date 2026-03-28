import type {
    SchemaQrCodeDto,
    SchemaQrCodeScanResultDto,
    SchemaRegenerateQrCodeDto,
    SchemaScanQrCodeDto,
} from "@workspace/api-client/core";

import { $api } from "@/modules/shared";

/**
 * Получить QR-код участника
 */
export async function getQrCodeByMemberId(memberId: string): Promise<SchemaQrCodeDto | null> {
    const response = await $api.GET("/crm/qr-codes/member/{memberId}", {
        params: {
            path: { memberId },
        },
    });

    if (!response.response.ok) {
        if (response.response.status === 404) {
            return null;
        }
        throw new Error(`Failed to fetch QR code: ${response.response.status}`);
    }

    return response.data as SchemaQrCodeDto;
}

/**
 * Сгенерировать или перегенерировать QR-код для участника
 */
export async function generateOrRegenerateQrCode(memberId: string): Promise<SchemaQrCodeDto> {
    const response = await $api.POST("/crm/qr-codes/generate", {
        body: { memberId } satisfies SchemaRegenerateQrCodeDto,
    });

    if (!response.response.ok) {
        throw new Error(`Failed to generate QR code: ${response.response.status}`);
    }

    return response.data as SchemaQrCodeDto;
}

/**
 * Сканировать QR-код (валидация)
 */
export async function scanQrCode(encryptedCode: string): Promise<SchemaQrCodeScanResultDto> {
    const response = await $api.POST("/crm/qr-codes/scan", {
        body: { encryptedCode } satisfies SchemaScanQrCodeDto,
    });

    if (!response.response.ok) {
        throw new Error(`Failed to scan QR code: ${response.response.status}`);
    }

    return response.data as SchemaQrCodeScanResultDto;
}

/**
 * Отозвать QR-код участника
 */
export async function revokeQrCode(memberId: string): Promise<void> {
    const response = await $api.DELETE("/crm/qr-codes/member/{memberId}", {
        params: {
            path: { memberId },
        },
    });

    if (!response.response.ok) {
        throw new Error(`Failed to revoke QR code: ${response.response.status}`);
    }
}
