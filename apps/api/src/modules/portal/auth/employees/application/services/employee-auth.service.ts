import { Injectable, UnauthorizedException } from "@nestjs/common";

import { UserRepository } from "@users/domain/repositories/user-repository.interface";
import * as bcrypt from "bcrypt";

import { AuthJwtPayload } from "@modules/portal/auth/domain/interfaces/jwt-payload.interface";
import { EmployeeAuthResponseDto } from "@modules/portal/auth/employees/api/dto/employee-auth-response.dto";
import { EmployeeLoginDto } from "@modules/portal/auth/employees/api/dto/employee-login.dto";
import { EmployeeRefreshTokenResponseDto } from "@modules/portal/auth/employees/api/dto/employee-refresh-token-response.dto";
import { TokenIssuerService } from "@modules/portal/auth/shared/application/services/token-issuer.service";
import { AuthenticatedUser } from "@modules/portal/auth/shared/domain/auth-user";

/**
 * Глобальная аутентификация employee-аккаунта (CRM).
 * Логин требует хотя бы одного активного трудоустройства (Employee) в любом портале;
 * конкретный портал резолвится per-request MembershipGuard'ом.
 */
@Injectable()
export class EmployeeAuthService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly tokenIssuer: TokenIssuerService
    ) {}

    async login(dto: EmployeeLoginDto, deviceId: string): Promise<EmployeeAuthResponseDto> {
        const user = await this.userRepository.findByEmailWithMemberships(dto.email);
        if (!user || !user.passwordHash) {
            throw new UnauthorizedException("Invalid credentials");
        }
        if (!user.isActive) {
            throw new UnauthorizedException("Email not confirmed");
        }
        const activeEmployments = user.employees.filter((e) => e.isActive);
        if (activeEmployments.length === 0) {
            throw new UnauthorizedException("Invalid credentials");
        }

        const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedException("Invalid credentials");
        }

        const tokens = await this.tokenIssuer.issueForUser(
            { id: user.id, email: user.email },
            "employee",
            deviceId
        );

        return {
            ...tokens,
            employee: {
                id: user.id,
                email: user.email,
                portals: activeEmployments.map((e) => ({
                    portalId: e.portalId,
                    role: e.role,
                })),
            },
        };
    }

    async validateJwtPayload(payload: AuthJwtPayload): Promise<AuthenticatedUser | null> {
        if (payload.type !== "employee") {
            return null;
        }
        try {
            const user = await this.userRepository.findById(payload.sub);
            if (!user || !user.isActive) {
                return null;
            }
            return {
                kind: "authenticated_user",
                userId: user.id,
                email: user.email,
                principalType: "employee",
                emailConfirmed: user.emailConfirmed,
                isActive: user.isActive,
            };
        } catch {
            return null;
        }
    }

    async refreshToken(refreshToken: string): Promise<EmployeeRefreshTokenResponseDto> {
        try {
            const { tokens } = await this.tokenIssuer.rotate(refreshToken, "employee");
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
        await this.tokenIssuer.revokeAllForUser(userId, "employee");
    }

    async generateTokens(
        user: { id: string; email: string },
        deviceId: string
    ): Promise<{ accessToken: string; refreshToken: string }> {
        return this.tokenIssuer.issueForUser(user, "employee", deviceId);
    }
}
