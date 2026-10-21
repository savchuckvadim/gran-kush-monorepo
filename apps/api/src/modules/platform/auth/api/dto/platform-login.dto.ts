import { ApiProperty } from "@nestjs/swagger";

import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";

export class PlatformLoginDto {
    @ApiProperty({ type: String })
    @IsEmail()
    email!: string;

    @ApiProperty({ type: String })
    @IsString()
    @MinLength(6)
    password!: string;
}

export class PlatformRefreshTokenDto {
    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    refreshToken!: string;
}

export class PlatformSessionTokensDto {
    @ApiProperty({ type: String })
    accessToken!: string;

    @ApiProperty({ type: String })
    refreshToken!: string;
}

export class PlatformAdminInfoDto {
    @ApiProperty({ type: String })
    id!: string;

    @ApiProperty({ type: String })
    role!: string;

    @ApiProperty({ type: String })
    email!: string;
}

export class PlatformLoginResponseDto extends PlatformSessionTokensDto {
    @ApiProperty({ type: PlatformAdminInfoDto })
    admin!: PlatformAdminInfoDto;
}
