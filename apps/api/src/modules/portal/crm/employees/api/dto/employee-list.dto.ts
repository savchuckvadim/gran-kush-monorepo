import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class EmployeeListItemDto {
    @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000" })
    id: string;

    @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000" })
    userId: string;

    @ApiProperty({ example: "employee@example.com" })
    email: string;

    @ApiProperty({ example: "John Employee" })
    name: string;

    @ApiPropertyOptional({ example: "Doe" })
    surname?: string;

    @ApiPropertyOptional({ example: "+1234567890" })
    phone?: string;

    @ApiProperty({ example: "manager" })
    role: string;

    @ApiPropertyOptional({ example: "Senior Manager" })
    position?: string;

    @ApiPropertyOptional({ example: "Sales" })
    department?: string;

    @ApiProperty({ example: true })
    isActive: boolean;

    @ApiPropertyOptional({ example: "2024-01-01T00:00:00.000Z" })
    lastLoginAt?: Date;

    @ApiProperty({ example: "2024-01-01T00:00:00.000Z" })
    createdAt: Date;

    @ApiProperty({ example: "2024-01-01T00:00:00.000Z" })
    updatedAt: Date;
}
