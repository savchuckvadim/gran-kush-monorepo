import { ConflictException, Injectable } from "@nestjs/common";

import { RegisterEmployeeDto } from "@auth/employees/api/dto/register-employee.dto";
import { EmployeeRepository } from "@employees/domain/repositories/employee-repository.interface";
import { UserRepository } from "@users/domain/repositories/user-repository.interface";
import * as bcrypt from "bcrypt";

@Injectable()
export class EmployeeRegistrationService {
    constructor(
        private readonly employeeRepository: EmployeeRepository,
        private readonly userRepository: UserRepository
    ) {}

    /**
     * Создание Employee с User
     */
    async createEmployee(dto: RegisterEmployeeDto): Promise<{
        userId: string;
        employeeId: string;
    }> {
        // Проверяем существование пользователя через репозиторий
        const existingUser = await this.userRepository.findByEmailWithRelations(dto.email);

        if (existingUser) {
            // Если уже есть Employee - ошибка
            if (existingUser.employee) {
                throw new ConflictException("User is already registered as Employee");
            }

            // Если есть Member, но не Employee - можно создать Employee
            const passwordHash = await bcrypt.hash(dto.password, 10);

            // Обновляем только passwordHash в User через репозиторий
            await this.userRepository.update(existingUser.id, { passwordHash });

            // Создаем Employee через репозиторий
            const employee = await this.employeeRepository.create({
                userId: existingUser.id,
                portalId: existingUser.portalId,
                name: dto.name,
                surname: dto.surname,
                phone: dto.phone,
                role: dto.role || "employee",
                position: dto.position,
                department: dto.department,
            });

            return {
                userId: existingUser.id,
                employeeId: employee.id,
            };
        }

        // Создаем нового User и Employee
        const passwordHash = await bcrypt.hash(dto.password, 10);

        // User содержит только email и passwordHash через репозиторий
        const user = await this.userRepository.create({
            email: dto.email,
            passwordHash,
            portalId: undefined,
        });

        // Employee содержит все остальные данные через репозиторий
        const employee = await this.employeeRepository.create({
            userId: user.id,
            name: dto.name,
            surname: dto.surname,
            phone: dto.phone,
            role: dto.role || "employee",
            position: dto.position,
            department: dto.department,
        });

        return {
            userId: user.id,
            employeeId: employee.id,
        };
    }
}
