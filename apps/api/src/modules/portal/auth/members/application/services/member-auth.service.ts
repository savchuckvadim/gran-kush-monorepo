import { Injectable, UnauthorizedException } from "@nestjs/common";

import { UserRepository } from "@users/domain/repositories/user-repository.interface";
import * as bcrypt from "bcrypt";

import { AuthJwtPayload } from "@modules/portal/auth/domain/interfaces/jwt-payload.interface";
import { MemberAuthResponseDto } from "@modules/portal/auth/members/api/dto/member-auth-response.dto";
import { MemberLoginDto } from "@modules/portal/auth/members/api/dto/member-login.dto";
import { MemberRefreshTokenResponseDto } from "@modules/portal/auth/members/api/dto/member-refresh-token-response.dto";
import { AuthenticatedUser } from "@modules/portal/auth/shared/domain/auth-user";
import { TokenIssuerService } from "@modules/portal/auth/shared/application/services/token-issuer.service";

/**
 * Глобальная аутентификация member-аккаунта (ЛК).
 * Токены не привязаны к порталу; membership резолвится per-request MembershipGuard'ом.
 */
@Injectable()
export class MemberAuthService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly tokenIssuer: TokenIssuerService
    ) {}

    async login(dto: MemberLoginDto, deviceId: string): Promise<MemberAuthResponseDto> {
        const user = await this.userRepository.findByEmail(dto.email);
        if (!user || !user.passwordHash) {
            throw new UnauthorizedException("Invalid credentials");
        }
        if (!user.isActive) {
            throw new UnauthorizedException("Email not confirmed");
        }

        const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedException("Invalid credentials");
        }

        const tokens = await this.tokenIssuer.issueForUser(
            { id: user.id, email: user.email },
            "member",
            deviceId
        );

        return {
            ...tokens,
            user: {
                id: user.id,
                email: user.email,
            },
        };
    }

    async validateJwtPayload(
        payload: AuthJwtPayload,
        allowUnconfirmed: boolean = false
    ): Promise<AuthenticatedUser | null> {
        if (payload.type !== "member") {
            return null;
        }
        try {
            const user = await this.userRepository.findById(payload.sub);
            if (!user) {
                return null;
            }
            if (!allowUnconfirmed && !user.isActive) {
                return null;
            }
            return {
                kind: "authenticated_user",
                userId: user.id,
                email: user.email,
                principalType: "member",
                emailConfirmed: user.emailConfirmed,
                isActive: user.isActive,
            };
        } catch {
            return null;
        }
    }

    async refreshToken(refreshToken: string): Promise<MemberRefreshTokenResponseDto> {
        try {
            const { tokens } = await this.tokenIssuer.rotate(refreshToken, "member");
            return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
        } catch (e) {
            if (e instanceof UnauthorizedException) throw e;
            throw new UnauthorizedException("Invalid refresh token");
        }
    }

    async logout(refreshToken: string): Promise<void> {
        await this.tokenIssuer.revokeByToken(refreshToken);
    }

    async logoutAll(userId: string): Promise<void> {
        await this.tokenIssuer.revokeAllForUser(userId, "member");
    }

    async generateTokens(
        user: { id: string; email: string },
        deviceId: string
    ): Promise<{ accessToken: string; refreshToken: string }> {
        return this.tokenIssuer.issueForUser(user, "member", deviceId);
    }
}
