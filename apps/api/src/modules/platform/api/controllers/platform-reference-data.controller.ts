import { Controller, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from "@nestjs/swagger";

import { PrismaService } from "@common/prisma/prisma.service";
import { ensureGlobalEntityTemplates } from "@common/reference-data/global-templates.seed";
import { PlatformJwtAuthGuard } from "@modules/platform/auth/infrastructure/guards/platform-jwt-auth.guard";

export class SeedReferenceDataResponseDto {
    @ApiProperty({ description: "Глобальные шаблоны сущностей обеспечены" })
    globalTemplatesEnsured!: boolean;
}

@ApiTags("Platform — справочники")
@Controller("platform/system")
@UseGuards(PlatformJwtAuthGuard)
@ApiBearerAuth()
export class PlatformReferenceDataController {
    constructor(private readonly prisma: PrismaService) {}

    @Post("reference-data")
    @ApiOperation({
        summary: "Засеять глобальные шаблоны сущностей платформы",
        description:
            "Идемпотентно. Вызовите при первом входе в платформенную панель или после деплоя.",
    })
    async seedReferenceData(): Promise<SeedReferenceDataResponseDto> {
        await ensureGlobalEntityTemplates(this.prisma);
        return { globalTemplatesEnsured: true };
    }
}
