import { ApiPropertyOptional } from "@nestjs/swagger";

import { EmployeeRole } from "@prisma/client";
import { IsEnum, IsOptional } from "class-validator";

import { IsQueryBoolean } from "@common/decorators/dto/query-boolean.decorator";
import { PaginationDto } from "@common/paginate/dto/pagination.dto";

export class EmployeeListQueryDto extends PaginationDto {
    @ApiPropertyOptional({ enum: EmployeeRole })
    @IsOptional()
    @IsEnum(EmployeeRole)
    role?: EmployeeRole;

    @ApiPropertyOptional({ type: Boolean })
    @IsOptional()
    @IsQueryBoolean()
    isActive?: boolean;
}
