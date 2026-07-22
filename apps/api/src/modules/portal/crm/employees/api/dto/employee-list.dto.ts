import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { EmployeeRole } from "@prisma/client";

export class EmployeeProfileFieldDto {
    @ApiProperty({ type: String, example: "first_name" })
    fieldKey: string;

    @ApiProperty({ type: String, example: "string" })
    type: string;

    @ApiProperty({ example: "First name", nullable: true, type: String })
    label: string | null;

    @ApiProperty({ type: Object, description: "Значение поля (JSON)" })
    value: unknown;
}

export class EmployeeListItemDto {
    @ApiProperty({ type: String, example: "123e4567-e89b-12d3-a456-426614174000" })
    id: string;

    @ApiProperty({ type: String, example: "123e4567-e89b-12d3-a456-426614174000" })
    userId: string;

    @ApiProperty({ type: String, example: "employee@example.com" })
    email: string;

    @ApiProperty({ enum: EmployeeRole, example: EmployeeRole.manager })
    role: EmployeeRole;

    @ApiProperty({ type: Boolean, example: true })
    isActive: boolean;

    @ApiProperty({ type: [EmployeeProfileFieldDto] })
    fields: EmployeeProfileFieldDto[];

    @ApiPropertyOptional({ type: String, format: "date-time", example: "2024-01-01T00:00:00.000Z" })
    lastLoginAt?: Date;

    @ApiProperty({ type: String, format: "date-time", example: "2024-01-01T00:00:00.000Z" })
    createdAt: Date;

    @ApiProperty({ type: String, format: "date-time", example: "2024-01-01T00:00:00.000Z" })
    updatedAt: Date;
}
