import { CabinetMemberProfileDto } from "@modules/portal/crm/members/api/dto/cabinet-member-profile.dto";
import { CrmMemberFullDto } from "@modules/portal/crm/members/api/dto/crm-member.dto";

/** Поля переносятся поимённо: новое поле CRM-карточки не попадёт в кабинет само собой. */
export const toCabinetMemberProfile = (member: CrmMemberFullDto): CabinetMemberProfileDto => ({
    id: member.id,
    email: member.email,
    name: member.name,
    surname: member.surname,
    phone: member.phone,
    birthday: member.birthday,
    address: member.address,
    membershipNumber: member.membershipNumber,
    statusItem: member.statusItem,
    isActive: member.isActive,
    consentStatus: member.consentStatus,
    documents: member.documents,
    hasSignature: member.hasSignature,
    createdAt: member.createdAt,
});
