import { ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";

import { ALLOW_UNCONFIRMED_KEY } from "@auth/members/api/decorators/allow-unconfirmed.decorator";
import { Observable } from "rxjs";

import { PASSPORT_JWT_STRATEGY } from "@common/auth";
import { IS_PUBLIC_KEY } from "@common/decorators/auth/public.decorator";

/** Нативное ЛК: JWT только из Authorization Bearer. */
@Injectable()
export class MemberJwtMobileAuthGuard extends AuthGuard(PASSPORT_JWT_STRATEGY.MEMBER_BEARER) {
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

        const allowUnconfirmed = this.reflector.getAllAndOverride<boolean>(ALLOW_UNCONFIRMED_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        const request = context.switchToHttp().getRequest<{ allowUnconfirmed?: boolean }>();
        request.allowUnconfirmed = allowUnconfirmed ?? false;

        return super.canActivate(context);
    }
}
