import { ApiProperty } from "@nestjs/swagger";

export class MemberLogoutResponseDto {
    @ApiProperty({
        example: "Logged out successfully",
        description: "Logout message",
    })
    message: string;
}
