import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class EmployeeLocalAuthGuard extends AuthGuard("employee-local") {}
