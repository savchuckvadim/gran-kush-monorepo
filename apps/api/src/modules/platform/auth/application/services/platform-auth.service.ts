import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

import { PrismaService } from "@common/prisma/prisma.service";
import {
    JWT_DEFAULTS,
    JWT_ENV_KEYS,
    JWT_ERROR_MESSAGES,
} from "@modules/portal/auth/domain/constants/jwt.constants";
import { PasswordSignInService } from "@modules/portal/auth/shared/application/services/password-sign-in.service";

export type PlatformAdminJwtPayload = {
    sub: string;
    type: "platform_admin";
    userId: string;
};

@Injectable()
export class PlatformAuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly passwords: PasswordSignInService
    ) {}

    async login(
        email: string,
        password: string
    ): Promise<{ accessToken: string; admin: { id: string; role: string; email: string } }> {
        const user = await this.prisma.user.findUnique({
            where: { email: email.trim().toLowerCase() },
            include: { platformAdmin: true },
        });

        // Пароль проверяется у любого адреса — одно время ответа и общий лимит неудач (TASK-667)
        await this.passwords.verify(email, password, user?.passwordHash ?? null);
        if (!user?.platformAdmin || !user.isActive || !user.platformAdmin.isActive) {
            throw new UnauthorizedException("Invalid credentials");
        }

        const payload: PlatformAdminJwtPayload = {
            sub: user.platformAdmin.id,
            type: "platform_admin",
            userId: user.id,
        };

        const baseSecret = this.configService.get<string>(JWT_ENV_KEYS.SECRET);
        const secret =
            this.configService.get<string>(JWT_ENV_KEYS.PLATFORM_SECRET) ||
            (baseSecret ? `${baseSecret}:platform` : undefined);
        if (!secret) {
            throw new Error(JWT_ERROR_MESSAGES.SECRET_NOT_CONFIGURED);
        }

        const expiresIn =
            this.configService.get<string>(JWT_ENV_KEYS.PLATFORM_ACCESS_EXPIRES_IN) ||
            JWT_DEFAULTS.PLATFORM_ACCESS_EXPIRES_IN;

        const accessToken = await this.jwtService.signAsync(payload as never, {
            secret,
            expiresIn: expiresIn as unknown as number,
        });

        return {
            accessToken,
            admin: {
                id: user.platformAdmin.id,
                role: user.platformAdmin.role,
                email: user.email,
            },
        };
    }

    async validateJwtPayload(payload: PlatformAdminJwtPayload) {
        if (payload.type !== "platform_admin") {
            return null;
        }
        const admin = await this.prisma.platformAdmin.findUnique({
            where: { id: payload.sub },
            include: { user: true },
        });
        if (!admin?.isActive || !admin.user.isActive) {
            return null;
        }
        return admin;
    }
}
