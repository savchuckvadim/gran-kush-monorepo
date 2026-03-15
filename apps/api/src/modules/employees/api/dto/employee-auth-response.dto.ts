import { ApiProperty } from "@nestjs/swagger";

export class EmployeeAuthResponseDto {
    @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." })
    accessToken: string;

    @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." })
    refreshToken: string;

    @ApiProperty({
        example: {
            id: "123e4567-e89b-12d3-a456-426614174000",
            email: "employee@example.com",
            name: "John Employee",
            role: "manager",
        },
    })
    employee: {
        id: string;
        email: string;
        name: string;
        role: string;
    };
}
