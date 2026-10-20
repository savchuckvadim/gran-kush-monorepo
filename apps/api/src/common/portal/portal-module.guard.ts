import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import type { Request } from "express";

import { PortalModulesService } from "@modules/portal/crm/portal-modules/application/portal-modules.service";
import {
    MODULE_DISABLED,
    type PortalModuleCode,
} from "@modules/portal/crm/portal-modules/domain/portal-module.catalog";

export const PORTAL_MODULE_KEY = "portal-module";

/** Маршрут принадлежит модулю: ставится через `CrmAuth({ module })`, не вручную. */
export const RequirePortalModule = (code: PortalModuleCode) => SetMetadata(PORTAL_MODULE_KEY, code);

/**
 * Модуль клуба включён (TASK-796). Стоит в цепочке `CrmAuth` после членства и прав: чужому клубу
 * и сотруднику без прав ответят их отказы, а не этот. Выключенный модуль — 403 `module_disabled`:
 * CRM показывает предложение подключить модуль.
 */
@Injectable()
export class PortalModuleGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly modules: PortalModulesService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const code = this.reflector.getAllAndOverride<PortalModuleCode | undefined>(
            PORTAL_MODULE_KEY,
            [context.getHandler(), context.getClass()]
        );
        if (!code) return true;
        const portalId = context.switchToHttp().getRequest<Request>().portalContext?.portalId;
        if (!portalId || !(await this.modules.isEnabled(portalId, code))) {
            throw new ForbiddenException({
                message: "This module is not enabled for the portal",
                code: MODULE_DISABLED,
                errors: [code],
            });
        }
        return true;
    }
}
