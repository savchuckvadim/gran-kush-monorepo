import { ApiProperty } from "@nestjs/swagger";

export class EmployeeLogoutResponseDto {
    @ApiProperty({ type: String,
        example: "Logged out successfully",
        description: "Logout message",
    })
    message: string;
}
