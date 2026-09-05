import { ApiPropertyOptional } from "@nestjs/swagger";

import { EmployeeRole } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsBoolean, IsEnum, IsOptional } from "class-validator";

import { PaginationDto } from "@common/paginate/dto/pagination.dto";

/** query-string несёт строки; `Type(() => Boolean)` не годится — Boolean("false") === true */
const queryBoolean = ({ value }: { value: unknown }): unknown =>
    value === "true" ? true : value === "false" ? false : value;

export class EmployeeListQueryDto extends PaginationDto {
    @ApiPropertyOptional({ enum: EmployeeRole })
    @IsOptional()
    @IsEnum(EmployeeRole)
    role?: EmployeeRole;

    @ApiPropertyOptional({ type: Boolean })
    @IsOptional()
    @Transform(queryBoolean)
    @IsBoolean()
    isActive?: boolean;
}
