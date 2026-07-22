import { Injectable } from "@nestjs/common";

import { RegisterEmployeeDto } from "@modules/portal/auth/employees/api/dto/register-employee.dto";
import { EmployeesService } from "@modules/portal/crm/employees/application/services/employees.service";

/**
 * CRM: создание сотрудника (admin). Пароль не задаётся — если аккаунта нет,
 * он создаётся в статусе pending_claim и клеймится пользователем позже.
 */
@Injectable()
export class EmployeeRegistrationService {
    constructor(private readonly employeesService: EmployeesService) {}

    async createEmployee(
        dto: RegisterEmployeeDto,
        portalId: string
    ): Promise<{
        userId: string;
        employeeId: string;
        isNewUser: boolean;
    }> {
        const { employee, isNewUser } = await this.employeesService.create(
            {
                email: dto.email,
                role: dto.role,
                fields: dto.fields ?? {},
            },
            portalId
        );

        return {
            userId: employee.employee.userId,
            employeeId: employee.employee.id,
            isNewUser,
        };
    }
}
