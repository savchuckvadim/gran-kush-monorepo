import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";

import { Strategy } from "passport-local";

import { MemberAuthService } from "@modules/portal/auth/members/application/services/member-auth.service";
import { Member } from "@modules/portal/crm/members/domain/entity/member.entity";

@Injectable()
export class MemberLocalStrategy extends PassportStrategy(Strategy, "member-local") {
    constructor(private readonly memberAuthService: MemberAuthService) {
        /* passport-local Strategy ctor */
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        super({
            usernameField: "email",
            passwordField: "password",
        });
    }

    async validate(email: string, password: string): Promise<Member> {
        const member = await this.memberAuthService.validateMember(email, password);

        if (!member) {
            throw new UnauthorizedException("Invalid email or password");
        }

        if (!member.isActive) {
            throw new UnauthorizedException("Member is not active");
        }

        return member;
    }
}
