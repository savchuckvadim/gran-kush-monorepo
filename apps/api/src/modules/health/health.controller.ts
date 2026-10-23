import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
    ApiOkResponse,
    ApiOperation,
    ApiServiceUnavailableResponse,
    ApiTags,
} from "@nestjs/swagger";

import { BrandService } from "@common/brand/brand.service";
import { Public } from "@common/decorators/auth/public.decorator";

import { HealthResponseDto, ReadinessResponseDto } from "./dto/health-response.dto";
import { HealthService } from "./health.service";

/** Version of a process started outside a CI image. */
const DEV_VERSION = "dev";

@ApiTags("Health")
@Controller()
export class HealthController {
    private readonly version: string;

    constructor(
        private readonly healthService: HealthService,
        private readonly brand: BrandService,
        config: ConfigService
    ) {
        this.version = config.get<string>("APP_VERSION")?.trim() || DEV_VERSION;
    }

    @Get("health")
    @Public()
    @ApiOperation({ summary: "Liveness: процесс жив, без обращения к БД; бренд и версия сборки" })
    @ApiOkResponse({ type: HealthResponseDto })
    getHealth(): HealthResponseDto {
        return { status: "ok", brand: this.brand.code, version: this.version };
    }

    @Get("ready")
    @Public()
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
