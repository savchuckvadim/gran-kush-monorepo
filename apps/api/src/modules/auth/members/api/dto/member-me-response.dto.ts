import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class MemberMeResponseDto {
    @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000" })
    id: string;

    @ApiProperty({ example: "user@example.com" })
    email: string;

    @ApiProperty({ example: "John" })
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
