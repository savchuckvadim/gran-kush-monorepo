import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";

import { EmployeesService } from "@employees/application/services/employees.service";
import { Employee } from "@employees/domain/entity/employee.entity";
import { Strategy } from "passport-local";

@Injectable()
export class EmployeeLocalStrategy extends PassportStrategy(Strategy, "employee-local") {
    constructor(private readonly employeesService: EmployeesService) {
        super({
            usernameField: "email",
            passwordField: "password",
        });
    }

    async validate(email: string, password: string): Promise<Employee> {
        const employee = await this.employeesService.validateEmployee(email, password);

        if (!employee) {
            throw new UnauthorizedException("Invalid email or password");
        }

        return employee;
    }
}
