import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

import { JWT_DEFAULTS, JWT_ENV_KEYS } from "@auth/domain/constants/jwt.constants";
import { EmployeeAuthResponseDto } from "@auth/employees/api/dto/employee-auth-response.dto";
import { EmployeeLoginDto } from "@auth/employees/api/dto/employee-login.dto";
import { EmployeeRefreshTokenResponseDto } from "@auth/employees/api/dto/employee-refresh-token-response.dto";
import { EmployeesService } from "@employees/application/services/employees.service";
import { Employee } from "@employees/domain/entity/employee.entity";
import { EmployeeRepository } from "@employees/domain/repositories/employee-repository.interface";
import { EmployeeTokenRepository } from "@employees/domain/repositories/employee-token-repository.interface";

interface EmployeeJwtPayload {
    sub: string; // employee id
    email: string;
    name: string;
    role: string;
    type: "employee"; // Тип для различения от user токенов
}

@Injectable()
export class EmployeeAuthService {
    constructor(
        private readonly employeesService: EmployeesService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly employeeRepository: EmployeeRepository,
        private readonly employeeTokenRepository: EmployeeTokenRepository
    ) {}

    /**
     * Вход сотрудника
     */
    async login(dto: EmployeeLoginDto): Promise<EmployeeAuthResponseDto> {
        const employee = await this.employeesService.validateEmployee(dto.email, dto.password);

        if (!employee) {
            throw new UnauthorizedException("Invalid credentials");
        }

        // Генерация токенов
        const tokens = await this.generateTokens(employee);

        return {
            ...tokens,
            employee: {
                id: employee.id,
                email: employee.email,
                name: employee.name,
                role: employee.role,
            },
        };
    }

    /**
     * Валидация JWT payload для сотрудника
     */
    async validateJwtPayload(payload: EmployeeJwtPayload): Promise<Employee | null> {
        if (payload.type !== "employee") {
            return null;
        }

        try {
            const employee = await this.employeesService.findById(payload.sub);
            if (!employee || !employee.isActive) {
                return null;
            }
            return employee;
        } catch {
            return null;
        }
    }

    /**
     * Обновление access token через refresh token
     */
    async refreshToken(refreshToken: string): Promise<EmployeeRefreshTokenResponseDto> {
        try {
            // Проверяем refresh token в БД через репозиторий
            const tokenRecord = await this.employeeTokenRepository.findByToken(refreshToken);

            if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
                throw new UnauthorizedException("Invalid or expired refresh token");
            }

            if (!tokenRecord.employee.isActive) {
                throw new UnauthorizedException("Employee is inactive");
            }

            const employee = await this.employeesService.findById(tokenRecord.employeeId);
            if (!employee) {
                throw new UnauthorizedException();
            }
            return await this.generateTokens(employee);
        } catch {
            throw new UnauthorizedException("Invalid refresh token");
        }
    }

    /**
     * Выход сотрудника (удаление refresh token)
     */
    async logout(refreshToken: string): Promise<void> {
        await this.employeeTokenRepository.deleteByToken(refreshToken);
    }

    /**
     * Выход со всех устройств
     */
    async logoutAll(employeeId: string): Promise<void> {
        await this.employeeTokenRepository.deleteByEmployeeId(employeeId);
    }

    /**
     * Генерация access и refresh токенов с сохранением в БД
     */
    async generateTokens(employee: Employee): Promise<{
        accessToken: string;
        refreshToken: string;
    }> {
        const payload: EmployeeJwtPayload = {
            sub: employee.id,
            email: employee.email,
            name: employee.name,
            role: employee.role,
            type: "employee",
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
        await this.employeeTokenRepository.create({
            token: refreshToken,
            employeeId: employee.id,
            expiresAt,
        });

        return { accessToken, refreshToken };
    }
}
