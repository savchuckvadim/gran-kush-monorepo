import { Module } from "@nestjs/common";

import { EmployeesModule } from "@employees/employees.module";
import { MembersModule } from "@members/members.module";

import { TestController } from "./test.controller";

@Module({
    imports: [EmployeesModule, MembersModule],
    controllers: [TestController],
})
export class TestModule {}
