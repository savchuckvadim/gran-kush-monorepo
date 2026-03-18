import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";

import { MemberAuthService } from "@auth/members/application/services/member-auth.service";
import { Member } from "@members/domain/entity/member.entity";
import { Strategy } from "passport-local";

@Injectable()
export class MemberLocalStrategy extends PassportStrategy(Strategy, "member-local") {
    constructor(private readonly memberAuthService: MemberAuthService) {
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
