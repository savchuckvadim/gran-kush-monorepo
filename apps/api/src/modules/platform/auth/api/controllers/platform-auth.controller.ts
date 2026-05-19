import { Body, Controller, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { PlatformLoginDto } from "@modules/platform/auth/api/dto/platform-login.dto";
import { PlatformAuthService } from "@modules/platform/auth/application/services/platform-auth.service";

@ApiTags("Platform auth")
@Controller("platform/auth")
export class PlatformAuthController {
    constructor(private readonly platformAuth: PlatformAuthService) {}

    @Post("login")
    @ApiOperation({ summary: "Платформенный админ: вход (отдельный JWT)" })
    async login(@Body() dto: PlatformLoginDto) {
        return this.platformAuth.login(dto.email, dto.password);
    }
}
