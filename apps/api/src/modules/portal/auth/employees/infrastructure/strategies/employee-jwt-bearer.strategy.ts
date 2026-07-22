import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";

import { ExtractJwt, Strategy } from "passport-jwt";

import { PASSPORT_JWT_STRATEGY } from "@common/auth";
import {
    JWT_ENV_KEYS,
    JWT_ERROR_MESSAGES,
} from "@modules/portal/auth/domain/constants/jwt.constants";
import { AuthJwtPayload } from "@modules/portal/auth/domain/interfaces/jwt-payload.interface";
import { EmployeeAuthService } from "@modules/portal/auth/employees/application/services/employee-auth.service";
import { AuthenticatedUser } from "@modules/portal/auth/shared/domain/auth-user";

/** Нативные клиенты CRM: только Authorization: Bearer (без cookie). */
@Injectable()
export class EmployeeJwtBearerStrategy extends PassportStrategy(
    Strategy,
    PASSPORT_JWT_STRATEGY.EMPLOYEE_BEARER
) {
    constructor(
        private readonly employeeAuthService: EmployeeAuthService,
        configService: ConfigService
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

    async validate(payload: AuthJwtPayload): Promise<AuthenticatedUser> {
        const user = await this.employeeAuthService.validateJwtPayload(payload);

        if (!user) {
            throw new UnauthorizedException("User not found or inactive");
        }

        return user;
    }
}
