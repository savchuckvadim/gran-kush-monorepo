import {
    SchemaCrmMemberAccountDocumentDto,
    SchemaCrmMemberDto,
    SchemaCrmMemberFullDto,
} from "@workspace/api-client/core";

export type CrmMemberListItem = SchemaCrmMemberDto;
/** Документ аккаунта (паспорт/ID) — совпадает с OpenAPI `CrmMemberAccountDocumentDto`. */
export type IdentityDocument = SchemaCrmMemberAccountDocumentDto;
export interface IMemberSignature {
    id: string;
    createdAt: string;
}
/** Детальная карточка member — совпадает с OpenAPI `CrmMemberFullDto`. */
export type CrmMemberDetails = SchemaCrmMemberFullDto;

export type CrmMemberListFilters = {
    statusItemId?: string;
    filterFieldKey?: string;
    filterValue?: string;
};