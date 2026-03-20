import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class EmployeeMeResponseDto {
    @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000", type: String })
    id: string;

    @ApiProperty({ example: "employee@example.com", type: String })
    email: string;

    @ApiProperty({ example: "John Employee", type: String })
    name: string;

    @ApiPropertyOptional({ example: "+1234567890", type: String })
    phone?: string;

    @ApiProperty({ example: "manager", type: String })
    role: string;

    @ApiPropertyOptional({
        example: "f5f0c2f1-c877-4f13-8b6a-5b5b7c8f9c1f",
        type: String,
    })
    portalId?: string;

    @ApiPropertyOptional({ example: "Senior Manager", type: String })
    position?: string;

    @ApiPropertyOptional({ example: "Sales", type: String })
    department?: string;

    @ApiProperty({ example: true, type: Boolean })
    isActive: boolean;

    @ApiPropertyOptional({
        example: "2024-01-01T00:00:00.000Z",
        type: String,
        format: "date-time",
    })
    lastLoginAt?: Date;

    @ApiProperty({
        example: "2024-01-01T00:00:00.000Z",
        type: String,
        format: "date-time",
    })
    createdAt: Date;

    @ApiProperty({
        example: "2024-01-01T00:00:00.000Z",
        type: String,
        format: "date-time",
    })
    updatedAt: Date;
}
