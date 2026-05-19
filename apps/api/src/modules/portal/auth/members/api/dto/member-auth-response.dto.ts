import { ApiProperty } from "@nestjs/swagger";

export class MemberUserInfoDto {
    @ApiProperty({ example: "507f1f77bcf86cd799439011", type: String })
    id: string;

    @ApiProperty({ example: "user@example.com", type: String })
    email: string;
}

export class MemberAuthResponseDto {
    @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", type: String })
    accessToken: string;

    @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", type: String })
    refreshToken: string;

    @ApiProperty({ type: () => MemberUserInfoDto })
    user: MemberUserInfoDto;
}
