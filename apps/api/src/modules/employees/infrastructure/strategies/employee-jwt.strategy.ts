import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";

import { JWT_ENV_KEYS, JWT_ERROR_MESSAGES } from "@auth/domain/constants/jwt.constants";
import { EmployeeAuthService } from "@employees/application/services/employee-auth.service";
import { Employee } from "@employees/domain/entity/employee.entity";
import { ExtractJwt, Strategy } from "passport-jwt";

interface EmployeeJwtPayload {
    sub: string;
    email: string;
    name: string;
    role: string;
    type: "employee";
}

@Injectable()
export class EmployeeJwtStrategy extends PassportStrategy(Strategy, "employee-jwt") {
    constructor(
        private readonly employeeAuthService: EmployeeAuthService,
        private readonly configService: ConfigService
    ) {
        const secretOrKey = configService.get<string>(JWT_ENV_KEYS.SECRET);
        if (!secretOrKey) {
            throw new Error(JWT_ERROR_MESSAGES.SECRET_NOT_CONFIGURED);
        }
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
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
