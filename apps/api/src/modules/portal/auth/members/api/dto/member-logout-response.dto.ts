import { ApiProperty } from "@nestjs/swagger";

export class MemberLogoutResponseDto {
    @ApiProperty({ type: String,
        example: "Logged out successfully",
        description: "Logout message",
    })
    message: string;
}
