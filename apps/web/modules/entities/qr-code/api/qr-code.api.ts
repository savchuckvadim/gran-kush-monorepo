import type { SchemaQrCodeWithPayloadDto } from "@workspace/api-client/core";

import { $api } from "@/modules/shared/api";

/**
 * Get current member's QR code
 */
export async function getMyQrCode(): Promise<SchemaQrCodeWithPayloadDto> {
    const response = await $api.GET("/lk/qr-code");

    if (!response.response.ok) {
        const error = await response.response.text();
        throw new Error(error || "Failed to get QR code");
    }

    return response.data as SchemaQrCodeWithPayloadDto;
}

/**
 * Regenerate current member's QR code
 */
export async function regenerateMyQrCode(): Promise<SchemaQrCodeWithPayloadDto> {
    const response = await $api.POST("/lk/qr-code/regenerate");

    if (!response.response.ok) {
        const error = await response.response.text();
        throw new Error(error || "Failed to regenerate QR code");
    }

    return response.data as SchemaQrCodeWithPayloadDto;
}
