import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";

import { Strategy } from "passport-local";

import { EmployeesService } from "@modules/portal/crm/employees/application/services/employees.service";
import { Employee } from "@modules/portal/crm/employees/domain/entity/employee.entity";

@Injectable()
export class EmployeeLocalStrategy extends PassportStrategy(Strategy, "employee-local") {
    constructor(private readonly employeesService: EmployeesService) {
        /* passport-local Strategy ctor */
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
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
