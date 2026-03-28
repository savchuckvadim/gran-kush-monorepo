import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

import { JWT_DEFAULTS, JWT_ENV_KEYS } from "@auth/domain/constants/jwt.constants";
import { EmployeeAuthResponseDto } from "@auth/employees/api/dto/employee-auth-response.dto";
import { EmployeeLoginDto } from "@auth/employees/api/dto/employee-login.dto";
import { EmployeeRefreshTokenResponseDto } from "@auth/employees/api/dto/employee-refresh-token-response.dto";
import { EmployeesService } from "@employees/application/services/employees.service";
import { Employee } from "@employees/domain/entity/employee.entity";
import { EmployeeTokenRepository } from "@employees/domain/repositories/employee-token-repository.interface";

import { requireEmployeePortalId } from "@common/portal";

interface EmployeeJwtPayload {
    sub: string;
    email: string;
    name: string;
    role: string;
    portalId?: string | null;
    type: "employee";
}

@Injectable()
export class EmployeeAuthService {
    constructor(
        private readonly employeesService: EmployeesService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly employeeTokenRepository: EmployeeTokenRepository
    ) {}

    async login(dto: EmployeeLoginDto, deviceId: string): Promise<EmployeeAuthResponseDto> {
        const employee = await this.employeesService.validateEmployee(dto.email, dto.password);

        if (!employee) {
            throw new UnauthorizedException("Invalid credentials");
        }

        const tokens = await this.generateTokens(employee, deviceId);

        return {
            ...tokens,
            employee: {
                id: employee.id,
                email: employee.email,
                name: employee.name,
                role: employee.role,
                portalId: employee.portalId,
            },
        };
    }

    async validateJwtPayload(payload: EmployeeJwtPayload): Promise<Employee | null> {
        if (payload.type !== "employee") {
            return null;
        }

        try {
            const employee = await this.employeesService.findById(payload.sub);
            if (!employee || !employee.isActive) {
                return null;
            }
            if (payload.portalId && employee.portalId && payload.portalId !== employee.portalId) {
                return null;
            }
            return employee;
        } catch {
            return null;
        }
    }

    /**
     * Rotation: старый refresh для этого устройства снимается (revoke), выдаётся новая пара.
     */
    async refreshToken(refreshToken: string): Promise<EmployeeRefreshTokenResponseDto> {
        try {
            const tokenRecord = await this.employeeTokenRepository.findActiveByToken(refreshToken);

            if (!tokenRecord) {
                throw new UnauthorizedException("Invalid or expired refresh token");
            }

            if (!tokenRecord.employee.isActive) {
                throw new UnauthorizedException("Employee is inactive");
            }

            const employee = await this.employeesService.findById(tokenRecord.employeeId);
            if (!employee) {
                throw new UnauthorizedException();
            }
            if (
                tokenRecord.portalId &&
                employee.portalId &&
                tokenRecord.portalId !== employee.portalId
            ) {
                throw new UnauthorizedException("Portal mismatch");
            }

            return await this.generateTokens(employee, tokenRecord.deviceId);
        } catch (e) {
            if (e instanceof UnauthorizedException) throw e;
            throw new UnauthorizedException("Invalid refresh token");
        }
    }

    async logout(refreshToken: string): Promise<void> {
        await this.employeeTokenRepository.deleteByToken(refreshToken);
    }

    async logoutAll(employeeId: string): Promise<void> {
        await this.employeeTokenRepository.deleteByEmployeeId(employeeId);
    }

    async generateTokens(
        employee: Employee,
        deviceId: string
    ): Promise<{
        accessToken: string;
        refreshToken: string;
    }> {
        const portalId = requireEmployeePortalId(employee);
        const payload: EmployeeJwtPayload = {
            sub: employee.id,
            email: employee.email,
            name: employee.name,
            role: employee.role,
            portalId,
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

        const expiresAt = new Date();
        const expiresInDays = parseInt(refreshTokenExpiresIn.replace("d", ""), 10) || 7;
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);

        await this.employeeTokenRepository.revokeAllActiveForEmployeeDevice(employee.id, deviceId);

        await this.employeeTokenRepository.create({
            token: refreshToken,
            employeeId: employee.id,
            deviceId,
            portalId,
            expiresAt,
        });

        return { accessToken, refreshToken };
    }
}
