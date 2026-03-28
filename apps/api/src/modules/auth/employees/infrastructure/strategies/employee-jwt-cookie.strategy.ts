import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";

import { JWT_ENV_KEYS, JWT_ERROR_MESSAGES } from "@auth/domain/constants/jwt.constants";
import { EmployeeAuthService } from "@auth/employees/application/services/employee-auth.service";
import { Employee } from "@employees/domain/entity/employee.entity";
import { ExtractJwt, Strategy } from "passport-jwt";

import { AUTH_GLOBAL_SCOPE, PASSPORT_JWT_STRATEGY } from "@common/auth";
import { ConfigCookieService } from "@common/cookie/services/config-cookie.service";

interface EmployeeJwtPayload {
    sub: string;
    email: string;
    name: string;
    role: string;
    portalId?: string | null;
    type: "employee";
}

/** CRM веб: только HttpOnly cookie (без Bearer). */
@Injectable()
export class EmployeeJwtCookieStrategy extends PassportStrategy(
    Strategy,
    PASSPORT_JWT_STRATEGY.EMPLOYEE_COOKIE
) {
    constructor(
        private readonly employeeAuthService: EmployeeAuthService,
        configService: ConfigService,
        configCookieService: ConfigCookieService
    ) {
        const secretOrKey = configService.get<string>(JWT_ENV_KEYS.SECRET);
        if (!secretOrKey) {
            throw new Error(JWT_ERROR_MESSAGES.SECRET_NOT_CONFIGURED);
        }
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (request: { cookies?: Record<string, unknown> }) => {
                    const accessName = configCookieService.getCookieNames(
                        AUTH_GLOBAL_SCOPE.CRM
                    ).access;
                    const token = request?.cookies?.[accessName];
                    return typeof token === "string" ? token : null;
                },
            ]),
            ignoreExpiration: false,
            secretOrKey,
            passReqToCallback: false,
        });
    }

    async validate(payload: EmployeeJwtPayload): Promise<Employee> {
        const employee = await this.employeeAuthService.validateJwtPayload(payload);

        if (!employee) {
            throw new UnauthorizedException("Employee not found or inactive");
        }

        return employee;
    }
}
