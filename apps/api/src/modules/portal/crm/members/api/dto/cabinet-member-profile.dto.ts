import { PickType } from "@nestjs/swagger";

import { CrmMemberFullDto } from "./crm-member.dto";

/**
 * Профиль участника в его кабинете. Только то, что человек и так знает о себе, плюс статус и
 * показанные клубу документы. Заметки сотрудников и поля анкеты клуба остаются в CRM: среди
 * них бывают служебные (TASK-666 M9).
 */
export class CabinetMemberProfileDto extends PickType(CrmMemberFullDto, [
    "id",
    "email",
    "name",
    "surname",
    "phone",
    "birthday",
    "address",
    "membershipNumber",
    "statusItem",
    "isActive",
    "consentStatus",
    "documents",
    "hasSignature",
    "createdAt",
] as const) {}
