import { ApiPropertyOptional } from "@nestjs/swagger";

import { IsBoolean, IsOptional, IsString } from "class-validator";

import { PaginationDto } from "../../../common/paginate/dto/pagination.dto";

export class UserQueryDto extends PaginationDto {
    @ApiPropertyOptional({
        example: "john",
        description: "Search by email or name",
    })
    @IsString()
    @IsOptional()
    search?: string;

    @ApiPropertyOptional({ example: true })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
