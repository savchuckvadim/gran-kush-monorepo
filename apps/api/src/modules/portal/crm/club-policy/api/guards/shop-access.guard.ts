import {
    applyDecorators,
    CanActivate,
    ExecutionContext,
    Injectable,
    SetMetadata,
    UnauthorizedException,
    UseGuards,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { CabinetAuth } from "@modules/portal/auth/sessions/api/session-auth.decorators";

import { MemberAccessService } from "../../application/services/member-access.service";

const SHOP_ACCESS_KEY = "shopAccess";

/** `browse` — the catalog; `order` — placing an order (stricter: approval, subscription). */
export type ShopAccessLevel = "browse" | "order";

/**
 * Applies the club's shop rules to a cabinet route. Runs after `CabinetAuth`, which puts the
 * member of the club from the request into `req.user`.
 */
@Injectable()
export class ShopAccessGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly access: MemberAccessService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const level = this.reflector.getAllAndOverride<ShopAccessLevel | undefined>(
            SHOP_ACCESS_KEY,
            [context.getHandler(), context.getClass()]
        );
        if (!level) return true;

        const member = context
            .switchToHttp()
            .getRequest<{ user?: { id: string; portalId: string } }>().user;
        if (!member) throw new UnauthorizedException();

        if (level === "browse") {
            await this.access.assertCanBrowse(member.id, member.portalId);
        } else {
            await this.access.assertCanOrder(member.id, member.portalId);
        }
        return true;
    }
}

/** Handler-level: the controller is already under `@CabinetAuth()`. */
export const RequireShopAccess = (level: ShopAccessLevel) =>
    applyDecorators(SetMetadata(SHOP_ACCESS_KEY, level), UseGuards(ShopAccessGuard));
