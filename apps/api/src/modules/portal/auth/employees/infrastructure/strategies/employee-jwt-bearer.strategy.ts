import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";

import { ExtractJwt, Strategy } from "passport-jwt";

import { PASSPORT_JWT_STRATEGY } from "@common/auth";
import {
    JWT_ENV_KEYS,
    JWT_ERROR_MESSAGES,
} from "@modules/portal/auth/domain/constants/jwt.constants";
import { EmployeeAuthService } from "@modules/portal/auth/employees/application/services/employee-auth.service";
import { Employee } from "@modules/portal/crm/employees/domain/entity/employee.entity";

interface EmployeeJwtPayload {
    sub: string;
    email: string;
    name: string;
    role: string;
    portalId?: string | null;
    type: "employee";
}

/** Нативные клиенты CRM: только Authorization: Bearer (без cookie). */
@Injectable()
export class EmployeeJwtBearerStrategy extends PassportStrategy(
    Strategy,
    PASSPORT_JWT_STRATEGY.EMPLOYEE_BEARER
) {
    constructor(
        private readonly employeeAuthService: EmployeeAuthService,
        private readonly configService: ConfigService
    ) {
        const secretOrKey = configService.get<string>(JWT_ENV_KEYS.SECRET);
        if (!secretOrKey) {
            throw new Error(JWT_ERROR_MESSAGES.SECRET_NOT_CONFIGURED);
        }
        /* passport-jwt: ExtractJwt typings */
        /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey,
            passReqToCallback: false,
        });
        /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
    }

    async validate(payload: EmployeeJwtPayload): Promise<Employee> {
        const employee = await this.employeeAuthService.validateJwtPayload(payload);

        if (!employee) {
            throw new UnauthorizedException("Employee not found or inactive");
        }

        return employee;
    }
}
