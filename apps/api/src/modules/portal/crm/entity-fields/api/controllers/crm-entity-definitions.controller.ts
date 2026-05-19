import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiProperty, ApiTags } from "@nestjs/swagger";

import { IsString, Matches, MaxLength, MinLength } from "class-validator";

import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { PrismaService } from "@common/prisma/prisma.service";
import { Admin, AdminGuard, RequireEmployeeJwt } from "@modules/portal/auth/employees";

export class CreateEntityDefinitionBodyDto {
    @ApiProperty({ example: "vendor", description: "Уникальный код сущности (snake_case)" })
    @IsString()
    @MinLength(1)
    @MaxLength(64)
    @Matches(/^[a-z][a-z0-9_]*$/, {
        message: "code must be lowercase snake_case starting with a letter",
    })
    code!: string;

    @ApiProperty({ example: "Поставщики" })
    @IsString()
    @MinLength(1)
    @MaxLength(255)
    name!: string;
}

@ApiTags("CRM Entity definitions")
@Controller("crm/entities")
@RequireEmployeeJwt()
export class CrmEntityDefinitionsController {
    constructor(private readonly prisma: PrismaService) {}

    @Get()
    @ApiOperation({ summary: "Список определений сущностей портала" })
    @ApiSuccessResponse(Object, { isArray: true })
    @ApiErrorResponse([401, 403])
    async list(@PortalId() portalId: string) {
        return this.prisma.entityDefinition.findMany({
            where: { portalId },
            orderBy: { code: "asc" },
        });
    }

    @Post()
    @UseGuards(AdminGuard)
    @Admin()
    @ApiOperation({ summary: "Создать кастомное определение сущности (не системное)" })
    @ApiSuccessResponse(Object)
    @ApiErrorResponse([401, 403, 409])
    async create(@PortalId() portalId: string, @Body() body: CreateEntityDefinitionBodyDto) {
        return this.prisma.entityDefinition.create({
            data: {
                portalId,
                code: body.code.trim(),
                name: body.name.trim(),
                isSystem: false,
                isActive: true,
            },
        });
    }
}
