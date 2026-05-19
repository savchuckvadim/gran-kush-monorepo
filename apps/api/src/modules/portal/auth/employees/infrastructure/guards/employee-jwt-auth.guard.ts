import { ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";

import { Observable } from "rxjs";

import { PASSPORT_JWT_STRATEGY } from "@common/auth";
import { IS_PUBLIC_KEY } from "@common/decorators/auth/public.decorator";

@Injectable()
export class EmployeeJwtAuthGuard extends AuthGuard(PASSPORT_JWT_STRATEGY.EMPLOYEE_COOKIE) {
    constructor(private reflector: Reflector) {
        super();
    }

    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic) {
            return true;
        }

        return super.canActivate(context);
    }
}
