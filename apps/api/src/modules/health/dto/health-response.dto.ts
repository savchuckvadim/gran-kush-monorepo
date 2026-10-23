import { ApiProperty } from "@nestjs/swagger";

import { BRAND_CODES, type BrandCode } from "@workspace/brand";

export class HealthResponseDto {
    @ApiProperty({ example: "ok", type: String })
    status: string;

    /** The deploy checks it: the right installation answers on this domain. */
    @ApiProperty({ example: "pafpaf", enum: BRAND_CODES, type: String })
    brand: BrandCode;

    /** Build of the image (`APP_VERSION`, the commit), `dev` outside CI. */
    @ApiProperty({ example: "0f6ba55", type: String })
    version: string;
}

export class ReadinessChecksDto {
    @ApiProperty({ example: "up", enum: ["up", "down"], type: String })
    database: "up" | "down";

    @ApiProperty({ example: "up", enum: ["up", "down"], type: String })
    redis: "up" | "down";
}

export class ReadinessResponseDto {
    @ApiProperty({ example: "ready", type: String })
    status: string;

    @ApiProperty({ type: ReadinessChecksDto })
    checks: ReadinessChecksDto;
}
