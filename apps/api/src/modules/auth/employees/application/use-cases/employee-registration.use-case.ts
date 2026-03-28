import { BadRequestException, Injectable } from "@nestjs/common";

import { RegisterEmployeeDto } from "@auth/employees/api/dto/register-employee.dto";
import { EmployeeAuthService } from "@auth/employees/application/services/employee-auth.service";
import { EmployeeRegistrationService } from "@auth/employees/application/services/employee-registration.service";
import { EmailVerificationService } from "@auth/shared/application/services/email-verification.service";
import { EmployeesService } from "@employees/application/services/employees.service";
import { UserRepository } from "@users/domain/repositories/user-repository.interface";
import { randomUUID } from "crypto";

import { EmployeeAuthResponseDto } from "@modules/employees/api/dto/employee-auth-response.dto";

@Injectable()
export class EmployeeRegistrationUseCase {
    constructor(
        private readonly employeeRegistrationService: EmployeeRegistrationService,
        private readonly employeeAuthService: EmployeeAuthService,
        private readonly employeesService: EmployeesService,
        private readonly emailVerificationService: EmailVerificationService,
        private readonly userRepository: UserRepository
    ) {}

    async execute(dto: RegisterEmployeeDto, portalId: string): Promise<EmployeeAuthResponseDto> {
        // Создаем Employee
        const { userId, employeeId } = await this.employeeRegistrationService.createEmployee(
            dto,
            portalId
        );

        // Получаем Employee для генерации токенов
        const employee = await this.employeesService.findById(employeeId);

        if (!employee) {
            throw new BadRequestException("Failed to create employee");
        }

        const deviceId = randomUUID();
        const tokens = await this.employeeAuthService.generateTokens(employee, deviceId);

        // Отправляем email для подтверждения
        const user = await this.userRepository.findById(userId);
        if (user) {
            await this.emailVerificationService.sendEmployeeVerificationEmail(employee, {
                id: user.id,
                email: user.email,
            });
        }

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
}
