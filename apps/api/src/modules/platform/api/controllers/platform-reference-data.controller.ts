import { Controller, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from "@nestjs/swagger";

import { PrismaService } from "@common/prisma/prisma.service";
import { ensureMjStatusDefaults } from "@common/reference-data/mj-status.seed";
import { PlatformJwtAuthGuard } from "@modules/platform/auth/infrastructure/guards/platform-jwt-auth.guard";

export class SeedReferenceDataResponseDto {
    @ApiProperty({ description: "Сколько записей MjStatus обработано (upsert)" })
    mjStatusesUpserted!: number;
}

@ApiTags("Platform — справочники")
@Controller("platform/system")
@UseGuards(PlatformJwtAuthGuard)
@ApiBearerAuth()
export class PlatformReferenceDataController {
    constructor(private readonly prisma: PrismaService) {}

    @Post("reference-data")
    @ApiOperation({
        summary: "Засеять глобальные справочники (MjStatus и т.п.) из JSON",
        description:
            "Идемпотентно. Вызовите при первом входе в платформенную панель или после деплоя, если справочники пусты.",
    })
    async seedReferenceData(): Promise<SeedReferenceDataResponseDto> {
        const mjStatusesUpserted = await ensureMjStatusDefaults(this.prisma);
        return { mjStatusesUpserted };
    }
}
