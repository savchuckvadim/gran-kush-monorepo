import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiProperty, ApiTags } from "@nestjs/swagger";

import { IsString, Matches, MaxLength, MinLength } from "class-validator";

import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { Admin, AdminGuard, RequireEmployeeJwt } from "@modules/portal/auth/employees";
import {
    EntityDefinitionsService,
    EntityDefinitionSummary,
} from "@modules/portal/crm/entity-fields/application/services/entity-definitions.service";

export class EntityDefinitionSummaryDto {
    @ApiProperty({ type: String })
    id!: string;

    @ApiProperty({ example: "vendor", type: String })
    code!: string;

    @ApiProperty({ example: "Поставщики", type: String })
    name!: string;

    @ApiProperty({ type: Boolean })
    isSystem!: boolean;

    @ApiProperty({ type: Boolean })
    isActive!: boolean;

    @ApiProperty({ type: String })
    createdAt!: string;
}

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
    constructor(private readonly entityDefinitions: EntityDefinitionsService) {}

    @Get()
    @ApiOperation({ summary: "Список определений сущностей портала" })
    @ApiSuccessResponse(EntityDefinitionSummaryDto, { isArray: true })
    @ApiErrorResponse([401, 403])
    async list(@PortalId() portalId: string): Promise<EntityDefinitionSummaryDto[]> {
        const defs = await this.entityDefinitions.list(portalId);
        return defs.map((d) => this.toSummary(d));
    }

    @Post()
    @UseGuards(AdminGuard)
    @Admin()
    @ApiOperation({
        summary: "Создать кастомную сущность (с дефолтными формами, полем title и воронкой)",
    })
    @ApiSuccessResponse(EntityDefinitionSummaryDto)
    @ApiErrorResponse([401, 403, 409])
    async create(
        @PortalId() portalId: string,
        @Body() body: CreateEntityDefinitionBodyDto
    ): Promise<EntityDefinitionSummaryDto> {
        const created = await this.entityDefinitions.create(portalId, body);
        return this.toSummary(created);
    }

    private toSummary(def: EntityDefinitionSummary): EntityDefinitionSummaryDto {
        return {
            id: def.id,
            code: def.code,
            name: def.name,
            isSystem: def.isSystem,
            isActive: def.isActive,
            createdAt: def.createdAt.toISOString(),
        };
    }
}
