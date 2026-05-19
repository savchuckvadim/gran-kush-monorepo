import { Module } from "@nestjs/common";

import { EmployeesModule } from "@modules/portal/crm/employees/employees.module";
import { MembersModule } from "@modules/portal/crm/members/members.module";

import { TestController } from "./test.controller";

@Module({
    imports: [EmployeesModule, MembersModule],
    controllers: [TestController],
})
export class TestModule {}
