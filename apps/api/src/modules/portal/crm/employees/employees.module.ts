import { Module } from "@nestjs/common";

import { UsersModule } from "@users/users.module";

import { PrismaModule } from "@common/prisma/prisma.module";
import { CrmEmployeesController } from "@modules/portal/crm/employees/api/controllers/crm-employees.controller";
import { EmployeesService } from "@modules/portal/crm/employees/application/services/employees.service";
import { EmployeeRepository } from "@modules/portal/crm/employees/domain/repositories/employee-repository.interface";
import { EmployeePrismaRepository } from "@modules/portal/crm/employees/infrastructure/repositories/employee.repository";
import { EntityFieldsModule } from "@modules/portal/crm/entity-fields/entity-fields.module";

@Module({
    imports: [PrismaModule, UsersModule, EntityFieldsModule],
    providers: [
        EmployeesService,
        {
            provide: EmployeeRepository,
            useClass: EmployeePrismaRepository,
        },
    ],
    controllers: [CrmEmployeesController],
    exports: [EmployeesService, EmployeeRepository],
})
export class EmployeesModule {}
