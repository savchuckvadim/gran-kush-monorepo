import type { Permission } from "./permissions";

/**
 * Правило «не шире своих прав»: сотрудник может выдать роль, изменить её права или тронуть коллегу,
 * только если все права этой роли есть у него самого. Так менеджер с `employees.manage` не повысит
 * себя или другого до админа и не снимет админа (TASK-731).
 */
export const coversPermissions = (
    actor: readonly Permission[],
    required: readonly Permission[]
): boolean => {
    const own = new Set(actor);
    return required.every((code) => own.has(code));
};
