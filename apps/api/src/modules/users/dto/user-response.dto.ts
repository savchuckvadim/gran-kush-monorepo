import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class UserResponseDto {
    @ApiProperty({ example: "507f1f77bcf86cd799439011" })
    id: string;

    @ApiProperty({ example: "user@example.com" })
    email: string;

    @ApiProperty({ example: "John Doe" })
    name: string;

    @ApiPropertyOptional({ example: "+1234567890" })
    phone?: string;

    @ApiProperty({ example: true })
    isActive: boolean;

    @ApiProperty({ example: "2024-01-01T00:00:00.000Z" })
    createdAt: Date;

    @ApiProperty({ example: "2024-01-01T00:00:00.000Z" })
    updatedAt: Date;
}
