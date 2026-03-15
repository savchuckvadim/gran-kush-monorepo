import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

import { AuthResponseDto } from "@auth/api/dto/auth-response.dto";
import { LoginDto } from "@auth/api/dto/login.dto";
import { JWT_DEFAULTS, JWT_ENV_KEYS } from "@auth/domain/constants/jwt.constants";
import { Member } from "@members/domain/entity/member.entity";
import { MemberRepository } from "@members/domain/repositories/member-repository.interface";
import { TokenRepository } from "@members/domain/repositories/token-repository.interface";
import { UserRepository } from "@users/domain/repositories/user-repository.interface";
import * as bcrypt from "bcrypt";

import { MembersService } from "./members.service";

interface MemberJwtPayload {
    sub: string; // member id
    userId: string; // user id
    email: string;
    type: "member"; // Тип для различения от employee токенов
}

@Injectable()
export class MemberAuthService {
    constructor(
        private readonly membersService: MembersService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly userRepository: UserRepository,
        private readonly tokenRepository: TokenRepository,
        private readonly memberRepository: MemberRepository
    ) {}

    /**
     * Вход Member
     */
    async login(dto: LoginDto): Promise<AuthResponseDto> {
        // Получаем User и Member через репозиторий
        const user = await this.userRepository.findByEmailWithRelations(dto.email);

        if (!user || !user.member) {
            throw new UnauthorizedException("Invalid credentials");
        }

        // Проверка активности
        if (!user.isActive || !user.member.isActive) {
            throw new UnauthorizedException("User or Member is inactive");
        }

        // Проверка пароля
        const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedException("Invalid credentials");
        }

        // Генерация токенов
        const tokens = await this.generateTokens(user.member, user);

        return {
            ...tokens,
            user: {
                id: user.id,
                email: user.email,
            },
        };
    }

    /**
     * Валидация пользователя для Local Strategy
     */
    async validateMember(email: string, password: string): Promise<Member | null> {
        const user = await this.userRepository.findByEmailWithRelations(email);

        if (!user || !user.member) {
            return null;
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid || !user.isActive || !user.member.isActive) {
            return null;
        }

        return user.member;
    }

    /**
     * Валидация JWT payload для Member
     */
    async validateJwtPayload(payload: MemberJwtPayload): Promise<Member | null> {
        if (payload.type !== "member") {
            return null;
        }

        try {
            const memberData = await this.memberRepository.findByUserId(payload.userId);
            if (!memberData) {
                return null;
            }

            if (!memberData.isActive || !memberData.user.isActive) {
                return null;
            }

            return this.mapToEntity(memberData);
        } catch {
            return null;
        }
    }

    /**
     * Обновление access token через refresh token
     */
    async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
        try {
            // Проверяем refresh token в БД через репозиторий
            const tokenRecord = await this.tokenRepository.findByToken(refreshToken);

            if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
                throw new UnauthorizedException("Invalid or expired refresh token");
            }

            if (!tokenRecord.user.isActive || !tokenRecord.user.member?.isActive) {
                throw new UnauthorizedException("User or Member is inactive");
            }

            const member = tokenRecord.user.member;
            if (!member) {
                throw new UnauthorizedException();
            }

            const payload: MemberJwtPayload = {
                sub: member.id,
                userId: tokenRecord.user.id,
                email: tokenRecord.user.email,
                type: "member",
            };

            const jwtSecret = this.configService.get<string>(JWT_ENV_KEYS.SECRET);
            const accessTokenExpiresIn: string =
                this.configService.get<string>(JWT_ENV_KEYS.ACCESS_TOKEN_EXPIRES_IN) ||
                JWT_DEFAULTS.ACCESS_TOKEN_EXPIRES_IN;

            const signOptions = {
                secret: jwtSecret || JWT_DEFAULTS.SECRET,
                expiresIn: accessTokenExpiresIn,
            } as { secret: string; expiresIn: string };

            // @ts-expect-error - JWT library type mismatch
            const accessToken = await this.jwtService.signAsync(payload, signOptions);

            return { accessToken };
        } catch {
            throw new UnauthorizedException("Invalid refresh token");
        }
    }

    /**
     * Выход Member (удаление refresh token)
     */
    async logout(refreshToken: string): Promise<void> {
        await this.tokenRepository.deleteByToken(refreshToken);
    }

    /**
     * Выход со всех устройств
     */
    async logoutAll(userId: string): Promise<void> {
        await this.tokenRepository.deleteByUserId(userId);
    }

    /**
     * Генерация access и refresh токенов с сохранением в БД
     */
    async generateTokens(
        member: { id: string; userId: string },
        user: { id: string; email: string }
    ): Promise<{
        accessToken: string;
        refreshToken: string;
    }> {
        const payload: MemberJwtPayload = {
            sub: member.id,
            userId: user.id,
            email: user.email,
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

        // Вычисляем дату истечения refresh token
        const expiresAt = new Date();
        const expiresInDays = parseInt(refreshTokenExpiresIn.replace("d", ""), 10) || 7;
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);

        // Сохраняем refresh token в БД через репозиторий
        await this.tokenRepository.create({
            token: refreshToken,
            userId: user.id,
            expiresAt,
        });

        return { accessToken, refreshToken };
    }

    /**
     * Маппинг Prisma модели в Entity
     */
    private mapToEntity(member: {
        id: string;
        userId: string;
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
