import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";

import { JWT_ENV_KEYS, JWT_ERROR_MESSAGES } from "@auth/domain/constants/jwt.constants";
import { MemberAuthService } from "@members/application/services/member-auth.service";
import { Member } from "@members/domain/entity/member.entity";
import { ExtractJwt, Strategy } from "passport-jwt";

interface MemberJwtPayload {
    sub: string;
    userId: string;
    email: string;
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
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey,
            passReqToCallback: false,
        });
    }

    async validate(payload: MemberJwtPayload): Promise<Member> {
        const member = await this.memberAuthService.validateJwtPayload(payload);

        if (!member) {
            throw new UnauthorizedException("Member not found or inactive");
        }

        return member;
    }
}
