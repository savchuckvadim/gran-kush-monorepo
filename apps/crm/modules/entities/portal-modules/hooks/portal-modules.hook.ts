import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { portalInfoKeys } from "@/modules/entities/portal";

import {
    getPortalModules,
    type PortalModuleCode,
    setPortalModule,
} from "../api/portal-modules.api";
import { portalModuleKeys } from "../model/portal-module-keys";

export function usePortalModules() {
    return useQuery({ queryKey: portalModuleKeys.all, queryFn: getPortalModules });
}

/** Включён ли модуль клуба; `undefined` — список ещё грузится. */
export function usePortalModuleEnabled(code: PortalModuleCode): boolean | undefined {
    const { data } = usePortalModules();
    return data?.find((module) => module.code === code)?.enabled;
}

/** Модуль меняет меню: перечитываем и список модулей, и сведения о клубе. */
export function useSetPortalModule() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ code, enabled }: { code: PortalModuleCode; enabled: boolean }) =>
            setPortalModule(code, enabled),
        onSuccess: () =>
            Promise.all([
                queryClient.invalidateQueries({ queryKey: portalModuleKeys.all }),
                queryClient.invalidateQueries({ queryKey: portalInfoKeys.all }),
            ]),
    });
}
