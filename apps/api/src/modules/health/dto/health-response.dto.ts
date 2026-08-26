import { ApiProperty } from "@nestjs/swagger";

export class HealthResponseDto {
    @ApiProperty({ example: "ok", type: String })
    status: string;
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
