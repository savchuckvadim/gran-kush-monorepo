import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService, JwtSignOptions } from "@nestjs/jwt";

import { PrincipalType } from "@prisma/client";

import { JWT_DEFAULTS, JWT_ENV_KEYS } from "@modules/portal/auth/domain/constants/jwt.constants";
import {
    AuthJwtPayload,
    AuthPrincipalType,
} from "@modules/portal/auth/domain/interfaces/jwt-payload.interface";
import {
    RefreshTokenRepository,
    RefreshTokenWithUser,
} from "@modules/portal/auth/shared/domain/repositories/refresh-token-repository.interface";

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

const toPrincipalType = (type: AuthPrincipalType): PrincipalType => PrincipalType[type];

/**
 * Выпуск и ротация глобальных (не привязанных к порталу) JWT-пар
 * для member/employee principals.
 */
@Injectable()
export class TokenIssuerService {
    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly refreshTokenRepository: RefreshTokenRepository
    ) {}

    async issueForUser(
        user: { id: string; email: string },
        principalType: AuthPrincipalType,
        deviceId: string
    ): Promise<TokenPair> {
        const payload: AuthJwtPayload = {
            sub: user.id,
            email: user.email,
            type: principalType,
        };

        const { accessToken, refreshToken, refreshExpiresAt } = await this.signPair(payload);

        await this.refreshTokenRepository.revokeAllActiveForUserDevice(
            toPrincipalType(principalType),
            user.id,
            deviceId
        );
        await this.refreshTokenRepository.create({
            token: refreshToken,
            principalType: toPrincipalType(principalType),
            userId: user.id,
            deviceId,
            expiresAt: refreshExpiresAt,
        });

        return { accessToken, refreshToken };
    }

    /**
     * Ротация: старый refresh отзывается, выдаётся новая пара.
     * Возвращает пару и user из токен-записи.
     */
    async rotate(
        refreshToken: string,
        principalType: AuthPrincipalType
    ): Promise<{ tokens: TokenPair; tokenRecord: RefreshTokenWithUser }> {
        const tokenRecord = await this.refreshTokenRepository.findActiveByToken(
            refreshToken,
            toPrincipalType(principalType)
        );
        if (!tokenRecord || !tokenRecord.user) {
            throw new UnauthorizedException("Invalid or expired refresh token");
        }
        if (!tokenRecord.user.isActive) {
            throw new UnauthorizedException("User is inactive");
        }

        await this.refreshTokenRepository.revokeById(tokenRecord.id);
        const tokens = await this.issueForUser(
            { id: tokenRecord.user.id, email: tokenRecord.user.email },
            principalType,
            tokenRecord.deviceId
        );
        return { tokens, tokenRecord };
    }

    async revokeByToken(refreshToken: string): Promise<void> {
        await this.refreshTokenRepository.deleteByToken(refreshToken);
    }

    async revokeAllForUser(userId: string, principalType: AuthPrincipalType): Promise<void> {
        await this.refreshTokenRepository.deleteByUser(toPrincipalType(principalType), userId);
    }

    private async signPair(
        payload: AuthJwtPayload
    ): Promise<{ accessToken: string; refreshToken: string; refreshExpiresAt: Date }> {
        const jwtSecret = this.configService.get<string>(JWT_ENV_KEYS.SECRET);
        const refreshSecret =
            this.configService.get<string>(JWT_ENV_KEYS.REFRESH_SECRET) || jwtSecret;
        const accessTokenExpiresIn =
            this.configService.get<string>(JWT_ENV_KEYS.ACCESS_TOKEN_EXPIRES_IN) ||
            JWT_DEFAULTS.ACCESS_TOKEN_EXPIRES_IN;
        const refreshTokenExpiresIn =
            this.configService.get<string>(JWT_ENV_KEYS.REFRESH_TOKEN_EXPIRES_IN) ||
            JWT_DEFAULTS.REFRESH_TOKEN_EXPIRES_IN;

        // env-строка вида "15m"/"7d" — до ms.StringValue сужается только кастом
        const signOptions: JwtSignOptions = {
            secret: jwtSecret || JWT_DEFAULTS.SECRET,
            expiresIn: accessTokenExpiresIn as JwtSignOptions["expiresIn"],
        };
        const refreshSignOptions: JwtSignOptions = {
            secret: refreshSecret || JWT_DEFAULTS.SECRET,
            expiresIn: refreshTokenExpiresIn as JwtSignOptions["expiresIn"],
        };

        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync({ ...payload }, signOptions),
            this.jwtService.signAsync({ ...payload }, refreshSignOptions),
        ]);

        const refreshExpiresAt = new Date();
        const expiresInDays = parseInt(refreshTokenExpiresIn.replace("d", ""), 10) || 7;
        refreshExpiresAt.setDate(refreshExpiresAt.getDate() + expiresInDays);

        return { accessToken, refreshToken, refreshExpiresAt };
    }
}
