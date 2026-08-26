import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import {
    ApiOkResponse,
    ApiOperation,
    ApiServiceUnavailableResponse,
    ApiTags,
} from "@nestjs/swagger";

import { HealthResponseDto, ReadinessResponseDto } from "./dto/health-response.dto";
import { HealthService } from "./health.service";

@ApiTags("Health")
@Controller()
export class HealthController {
    constructor(private readonly healthService: HealthService) {}

    @Get("health")
    @ApiOperation({ summary: "Liveness: процесс жив, без обращения к БД" })
    @ApiOkResponse({ type: HealthResponseDto })
    getHealth(): HealthResponseDto {
        return { status: "ok" };
    }

    @Get("ready")
    @ApiOperation({ summary: "Readiness: Postgres и Redis доступны" })
    @ApiOkResponse({ type: ReadinessResponseDto })
    @ApiServiceUnavailableResponse({ description: "Одна из зависимостей недоступна" })
    async getReadiness(): Promise<ReadinessResponseDto> {
        const result = await this.healthService.checkReadiness();

        if (!result.ready) {
            throw new ServiceUnavailableException({
                message: "Service not ready",
                checks: result.checks,
            });
        }

        return { status: "ready", checks: result.checks };
    }
}
