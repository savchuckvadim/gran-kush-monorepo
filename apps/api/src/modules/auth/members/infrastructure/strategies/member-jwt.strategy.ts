import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";

import { JWT_ENV_KEYS, JWT_ERROR_MESSAGES } from "@auth/domain/constants/jwt.constants";
import { MemberAuthService } from "@auth/members/application/services/member-auth.service";
import { Member } from "@members/domain/entity/member.entity";
import { ExtractJwt, Strategy } from "passport-jwt";

interface MemberJwtPayload {
    sub: string;
    userId: string;
    email: string;
    portalId?: string | null;
    type: "member";
}

@Injectable()
export class MemberJwtStrategy extends PassportStrategy(Strategy, "member-jwt") {
    constructor(
        private readonly memberAuthService: MemberAuthService,
        private readonly configService: ConfigService
    ) {
        const secretOrKey = configService.get<string>(JWT_ENV_KEYS.SECRET);
        if (!secretOrKey) {
            throw new Error(JWT_ERROR_MESSAGES.SECRET_NOT_CONFIGURED);
        }
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                ExtractJwt.fromAuthHeaderAsBearerToken(),
                (request: { cookies?: Record<string, unknown> }) => {
                    const token = request?.cookies?.site_access_token;
                    return typeof token === "string" ? token : null;
                },
            ]),
            ignoreExpiration: false,
            secretOrKey,
            passReqToCallback: true,
        });
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
