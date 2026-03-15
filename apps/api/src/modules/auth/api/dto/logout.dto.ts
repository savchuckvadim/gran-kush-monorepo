import { ApiProperty } from "@nestjs/swagger";

export class LogoutDto {
    @ApiProperty({
        example: "Logged out successfully",
        description: "Logout message",
    })
    message: string;
}
