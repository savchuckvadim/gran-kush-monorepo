import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class MemberMeResponseDto {
    @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000", type: String })
    id: string;

    @ApiProperty({ example: "user@example.com", type: String })
    email: string;

    @ApiProperty({ example: "John", type: String })
    name: string;

    @ApiPropertyOptional({ example: "+1234567890", type: String })
    phone?: string;

    @ApiProperty({ example: true, type: Boolean })
    isActive: boolean;

    @ApiProperty({ example: "2024-01-01T00:00:00.000Z", type: String, format: "date-time" })
    createdAt: Date;

    @ApiProperty({ example: "2024-01-01T00:00:00.000Z", type: String, format: "date-time" })
    updatedAt: Date;
}
