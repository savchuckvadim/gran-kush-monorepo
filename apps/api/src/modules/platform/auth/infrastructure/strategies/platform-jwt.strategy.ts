import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";

import { ExtractJwt, Strategy } from "passport-jwt";

import {
    PlatformAdminJwtPayload,
    PlatformAuthService,
} from "@modules/platform/auth/application/services/platform-auth.service";
import { JWT_DEFAULTS, JWT_ENV_KEYS } from "@modules/portal/auth/domain/constants/jwt.constants";

@Injectable()
export class PlatformJwtStrategy extends PassportStrategy(Strategy, "platform-jwt") {
    constructor(
        private readonly platformAuth: PlatformAuthService,
        configService: ConfigService
    ) {
        /* passport-jwt: ExtractJwt / Strategy ctor typings are incomplete */
        /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey:
                configService.get<string>(JWT_ENV_KEYS.PLATFORM_SECRET) ||
                `${configService.get<string>(JWT_ENV_KEYS.SECRET) || JWT_DEFAULTS.SECRET}:platform`,
        });
        /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
    }

    async validate(payload: PlatformAdminJwtPayload) {
        const admin = await this.platformAuth.validateJwtPayload(payload);
        if (!admin) {
            throw new UnauthorizedException();
        }
        return admin;
    }
}
