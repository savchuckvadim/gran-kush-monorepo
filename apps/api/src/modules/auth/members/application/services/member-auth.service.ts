import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

import { JWT_DEFAULTS, JWT_ENV_KEYS } from "@auth/domain/constants/jwt.constants";
import { MemberAuthResponseDto } from "@auth/members/api/dto/member-auth-response.dto";
import { MemberLoginDto } from "@auth/members/api/dto/member-login.dto";
import { MemberRefreshTokenResponseDto } from "@auth/members/api/dto/member-refresh-token-response.dto";
import { Member } from "@members/domain/entity/member.entity";
import { MemberRepository } from "@members/domain/repositories/member-repository.interface";
import { TokenRepository } from "@members/domain/repositories/token-repository.interface";
import { UserRepository } from "@users/domain/repositories/user-repository.interface";
import * as bcrypt from "bcrypt";

import { requireMemberPortalId } from "@common/portal";

interface MemberJwtPayload {
    sub: string;
    userId: string;
    email: string;
    portalId?: string | null;
    type: "member";
}

@Injectable()
export class MemberAuthService {
    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly userRepository: UserRepository,
        private readonly tokenRepository: TokenRepository,
        private readonly memberRepository: MemberRepository
    ) {}

    async login(dto: MemberLoginDto, deviceId: string): Promise<MemberAuthResponseDto> {
        const user = await this.userRepository.findByEmailWithRelations(dto.email);

        if (!user || !user.member) {
            throw new UnauthorizedException("Invalid credentials");
        }

        if (!user.isActive) {
            throw new UnauthorizedException("Email not confirmed");
        }
        if (!user.member.isActive) {
            throw new UnauthorizedException("Member is inactive");
        }

        const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedException("Invalid credentials");
        }

        const tokens = await this.generateTokens(user.member, user, deviceId);

        return {
            ...tokens,
            user: {
                id: user.id,
                email: user.email,
            },
        };
    }

    async validateMember(email: string, password: string): Promise<Member | null> {
        const user = await this.userRepository.findByEmailWithRelations(email);

        if (!user || !user.member) {
            return null;
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            return null;
        }

        return user.member;
    }

    async validateJwtPayload(
        payload: MemberJwtPayload,
        allowUnconfirmed: boolean = false
    ): Promise<Member | null> {
        if (payload.type !== "member") {
            return null;
        }

        try {
            const memberData = await this.memberRepository.findByUserId(payload.userId);
            if (!memberData) {
                return null;
            }

            if (!allowUnconfirmed) {
                if (!memberData.isActive || !memberData.user.isActive) {
                    return null;
                }
            }
            if (
                payload.portalId &&
                memberData.portalId &&
                payload.portalId !== memberData.portalId
            ) {
                return null;
            }

            return this.mapToEntity(memberData);
        } catch {
            return null;
        }
    }

    async refreshToken(refreshToken: string): Promise<MemberRefreshTokenResponseDto> {
        try {
            const tokenRecord = await this.tokenRepository.findActiveByToken(refreshToken);

            if (!tokenRecord) {
                throw new UnauthorizedException("Invalid or expired refresh token");
            }

            if (!tokenRecord.user.isActive || !tokenRecord.user.member?.isActive) {
                throw new UnauthorizedException("User or Member is inactive");
            }

            const member = tokenRecord.user.member;
            if (!member) {
                throw new UnauthorizedException();
            }

            if (
                tokenRecord.portalId &&
                member.portalId &&
                tokenRecord.portalId !== member.portalId
            ) {
                throw new UnauthorizedException("Portal mismatch");
            }

            const user = tokenRecord.user;
            const tokens = await this.generateTokens(member, user, tokenRecord.deviceId);
            return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
        } catch (e) {
            if (e instanceof UnauthorizedException) throw e;
            throw new UnauthorizedException("Invalid refresh token");
        }
    }

    async logout(refreshToken: string): Promise<void> {
        await this.tokenRepository.deleteByToken(refreshToken);
    }

    async logoutAll(userId: string): Promise<void> {
        await this.tokenRepository.deleteByUserId(userId);
    }

    async generateTokens(
        member: { id: string; userId: string; portalId?: string | null },
        user: { id: string; email: string },
        deviceId: string
    ): Promise<{
        accessToken: string;
        refreshToken: string;
    }> {
        const portalId = requireMemberPortalId(member);
        const payload: MemberJwtPayload = {
            sub: member.id,
            userId: user.id,
            email: user.email,
            portalId,
            type: "member",
        };

        const jwtSecret = this.configService.get<string>(JWT_ENV_KEYS.SECRET);
        const refreshSecret =
            this.configService.get<string>(JWT_ENV_KEYS.REFRESH_SECRET) || jwtSecret;
        const accessTokenExpiresIn =
            this.configService.get<string>(JWT_ENV_KEYS.ACCESS_TOKEN_EXPIRES_IN) ||
            JWT_DEFAULTS.ACCESS_TOKEN_EXPIRES_IN;
        const refreshTokenExpiresIn =
            this.configService.get<string>(JWT_ENV_KEYS.REFRESH_TOKEN_EXPIRES_IN) ||
            JWT_DEFAULTS.REFRESH_TOKEN_EXPIRES_IN;

        const signOptions = {
            secret: jwtSecret || JWT_DEFAULTS.SECRET,
            expiresIn: accessTokenExpiresIn,
        } as { secret: string; expiresIn: string };
        const refreshSignOptions = {
            secret: refreshSecret || JWT_DEFAULTS.SECRET,
            expiresIn: refreshTokenExpiresIn,
        } as { secret: string; expiresIn: string };

        const [accessToken, refreshToken] = await Promise.all([
            // @ts-expect-error - JWT library type mismatch
            this.jwtService.signAsync(payload, signOptions),
            // @ts-expect-error - JWT library type mismatch
            this.jwtService.signAsync(payload, refreshSignOptions),
        ]);

        const expiresAt = new Date();
        const expiresInDays = parseInt(refreshTokenExpiresIn.replace("d", ""), 10) || 7;
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);

        await this.tokenRepository.revokeAllActiveForUserDevice(user.id, deviceId);

        await this.tokenRepository.create({
            token: refreshToken,
            userId: user.id,
            deviceId,
            portalId,
            expiresAt,
        });

        return { accessToken, refreshToken };
    }

    private mapToEntity(member: {
        id: string;
        userId: string;
        portalId: string | null;
        name: string;
        surname: string | null;
        phone: string | null;
        birthday: Date | null;
        membershipNumber: string | null;
        address: string | null;
        status: string;
        notes: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }): Member {
        return new Member({
            id: member.id,
            userId: member.userId,
            portalId: member.portalId || undefined,
            name: member.name,
            surname: member.surname || undefined,
            phone: member.phone || undefined,
            birthday: member.birthday || undefined,
            membershipNumber: member.membershipNumber || undefined,
            address: member.address || undefined,
            status: member.status,
            notes: member.notes || undefined,
            isActive: member.isActive,
            createdAt: member.createdAt,
            updatedAt: member.updatedAt,
        });
    }
}
