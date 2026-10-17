import { ApiPropertyOptional } from "@nestjs/swagger";

import { IsOptional } from "class-validator";

import { IsQueryBoolean } from "@common/decorators/dto/query-boolean.decorator";
import { PaginationDto } from "@common/paginate/dto/pagination.dto";
import { IsRoleKey } from "@modules/portal/crm/access/api/dto/role-key.decorator";

export class EmployeeListQueryDto extends PaginationDto {
    @ApiPropertyOptional({ type: String, description: "Ключ роли клуба" })
    @IsOptional()
    @IsRoleKey()
    role?: string;

    @ApiPropertyOptional({ type: Boolean })
    @IsOptional()
    @IsQueryBoolean()
    isActive?: boolean;
}
