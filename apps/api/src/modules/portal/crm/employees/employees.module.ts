import { Module } from "@nestjs/common";

import { PrismaModule } from "@common/prisma/prisma.module";
import { CrmEmployeesController } from "@modules/portal/crm/employees/api/controllers/crm-employees.controller";
import { EmployeesService } from "@modules/portal/crm/employees/application/services/employees.service";
import { EmployeeRepository } from "@modules/portal/crm/employees/domain/repositories/employee-repository.interface";
import { EmployeePrismaRepository } from "@modules/portal/crm/employees/infrastructure/repositories/employee.repository";

@Module({
    imports: [PrismaModule],
    providers: [
        EmployeesService,
        {
            provide: EmployeeRepository,
            useClass: EmployeePrismaRepository,
        },
    ],
    controllers: [CrmEmployeesController],
    exports: [EmployeesService],
})
export class EmployeesModule {}
