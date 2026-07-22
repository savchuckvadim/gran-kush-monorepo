import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";

import { ExtractJwt, Strategy } from "passport-jwt";

import { PASSPORT_JWT_STRATEGY } from "@common/auth";
import {
    JWT_ENV_KEYS,
    JWT_ERROR_MESSAGES,
} from "@modules/portal/auth/domain/constants/jwt.constants";
import { AuthJwtPayload } from "@modules/portal/auth/domain/interfaces/jwt-payload.interface";
import { MemberAuthService } from "@modules/portal/auth/members/application/services/member-auth.service";
import { AuthenticatedUser } from "@modules/portal/auth/shared/domain/auth-user";

/** Нативное приложение ЛК: только Authorization: Bearer. */
@Injectable()
export class MemberJwtBearerStrategy extends PassportStrategy(
    Strategy,
    PASSPORT_JWT_STRATEGY.MEMBER_BEARER
) {
    constructor(
        private readonly memberAuthService: MemberAuthService,
        configService: ConfigService
    ) {
        const secretOrKey = configService.get<string>(JWT_ENV_KEYS.SECRET);
        if (!secretOrKey) {
            throw new Error(JWT_ERROR_MESSAGES.SECRET_NOT_CONFIGURED);
        }
        /* passport-jwt: ExtractJwt typings */
        /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey,
            passReqToCallback: true,
        });
        /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
    }

    async validate(
        req: { allowUnconfirmed?: boolean },
        payload: AuthJwtPayload
    ): Promise<AuthenticatedUser> {
        const allowUnconfirmed = req?.allowUnconfirmed === true;
        const user = await this.memberAuthService.validateJwtPayload(payload, allowUnconfirmed);

        if (!user) {
            throw new UnauthorizedException("User not found or inactive");
        }

        return user;
    }
}
