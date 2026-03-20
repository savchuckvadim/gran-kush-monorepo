import { ApiProperty } from "@nestjs/swagger";

export class MemberRefreshTokenResponseDto {
    @ApiProperty({
        example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        description: "New access token",
        type: String,
    })
    accessToken: string;
}
