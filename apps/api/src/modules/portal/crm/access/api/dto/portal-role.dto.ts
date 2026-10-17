import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import {
    ArrayMaxSize,
    IsArray,
    IsIn,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from "class-validator";

import { ALL_PERMISSIONS, Permission } from "../../domain/permissions";

const ROLE_NAME_MAX = 120;

export class PortalRoleDto {
    @ApiProperty({ type: String })
    id: string;

    @ApiProperty({
        type: String,
        example: "manager",
        description: "owner, admin, manager, employee или custom_…",
    })
    key: string;

    @ApiProperty({
        type: String,
        nullable: true,
        description: "Название своей роли; у системной — null",
    })
    name: string | null;

    @ApiProperty({ type: Boolean })
    isSystem: boolean;

    @ApiProperty({
        type: Boolean,
        description: "Права можно менять (у владельца и админа — полный доступ)",
    })
    isEditable: boolean;

    @ApiProperty({ type: Boolean, description: "Роль можно выдать сотруднику (кроме владельца)" })
    isAssignable: boolean;

    @ApiProperty({ enum: ALL_PERMISSIONS, enumName: "Permission", isArray: true })
    permissions: Permission[];

    @ApiProperty({ type: Number })
    employeeCount: number;
}

export class PermissionGroupDto {
    @ApiProperty({ type: String, example: "members" })
    key: string;

    @ApiProperty({ enum: ALL_PERMISSIONS, enumName: "Permission", isArray: true })
    permissions: Permission[];
}

export class PortalRolesResponseDto {
    @ApiProperty({ type: [PortalRoleDto] })
    roles: PortalRoleDto[];

    @ApiProperty({
        type: [PermissionGroupDto],
        description: "Каталог прав по разделам — порядок экрана",
    })
    catalog: PermissionGroupDto[];
}

export class CreatePortalRoleDto {
    @ApiProperty({ type: String, example: "Бармен" })
    @IsString()
    @MinLength(1)
    @MaxLength(ROLE_NAME_MAX)
    name: string;

    @ApiProperty({ enum: ALL_PERMISSIONS, enumName: "Permission", isArray: true })
    @IsArray()
    @ArrayMaxSize(ALL_PERMISSIONS.length)
    @IsIn(ALL_PERMISSIONS, { each: true })
    permissions: Permission[];
}

export class UpdatePortalRoleDto {
    @ApiPropertyOptional({ type: String, description: "Только у своей роли" })
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(ROLE_NAME_MAX)
    name?: string;

    @ApiPropertyOptional({ enum: ALL_PERMISSIONS, enumName: "Permission", isArray: true })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(ALL_PERMISSIONS.length)
    @IsIn(ALL_PERMISSIONS, { each: true })
    permissions?: Permission[];
}

/** Роль в ответах про сотрудников и приглашения. */
export class EmployeeRoleDto {
    @ApiProperty({ type: String })
    id: string;

    @ApiProperty({ type: String, example: "manager" })
    key: string;

    @ApiProperty({ type: String, nullable: true })
    name: string | null;

    @ApiProperty({ type: Boolean })
    isSystem: boolean;
}
