import { ApiProperty } from "@nestjs/swagger";

export class EmployeeLogoutResponseDto {
    @ApiProperty({
        example: "Logged out successfully",
        description: "Logout message",
    })
    message: string;
}
