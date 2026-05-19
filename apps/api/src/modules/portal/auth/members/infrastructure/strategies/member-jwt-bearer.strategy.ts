import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";

import { ExtractJwt, Strategy } from "passport-jwt";

import { PASSPORT_JWT_STRATEGY } from "@common/auth";
import {
    JWT_ENV_KEYS,
    JWT_ERROR_MESSAGES,
} from "@modules/portal/auth/domain/constants/jwt.constants";
import { MemberAuthService } from "@modules/portal/auth/members/application/services/member-auth.service";
import { Member } from "@modules/portal/crm/members/domain/entity/member.entity";

interface MemberJwtPayload {
    sub: string;
    userId: string;
    email: string;
    portalId?: string | null;
    type: "member";
}

/** Нативное приложение ЛК: только Authorization: Bearer. */
@Injectable()
export class MemberJwtBearerStrategy extends PassportStrategy(
    Strategy,
    PASSPORT_JWT_STRATEGY.MEMBER_BEARER
) {
    constructor(
        private readonly memberAuthService: MemberAuthService,
        private readonly configService: ConfigService
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
        payload: MemberJwtPayload
    ): Promise<Member> {
        const allowUnconfirmed = req?.allowUnconfirmed === true;
        const member = await this.memberAuthService.validateJwtPayload(payload, allowUnconfirmed);

        if (!member) {
            throw new UnauthorizedException("Member not found or inactive");
        }

        if (!member.isActive && !allowUnconfirmed) {
            throw new UnauthorizedException("Member is not active");
        }

        return member;
    }
}
