import { Module } from "@nestjs/common";

import { EmployeesService } from "@employees/application/services/employees.service";
import { EmployeeRepository } from "@employees/domain/repositories/employee-repository.interface";
import { EmployeePrismaRepository } from "@employees/infrastructure/repositories/employee.repository";

import { PrismaModule } from "@common/prisma/prisma.module";

@Module({
    imports: [PrismaModule],
    providers: [
        EmployeesService,
        {
            provide: EmployeeRepository,
            useClass: EmployeePrismaRepository,
        },
    ],
    controllers: [],
    exports: [EmployeesService],
})
export class EmployeesModule {}
