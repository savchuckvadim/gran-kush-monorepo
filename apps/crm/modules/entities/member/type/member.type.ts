import { SchemaCrmMemberDto, SchemaCrmMemberFullDto } from "@workspace/api-client/core";

export type CrmMemberListItem = SchemaCrmMemberDto;
export interface IdentityDocument {
    id: string;
    type: string;
    side: string | null;
    storagePath: string;
    createdAt: string;
}
export interface IMemberSignature {
    id: string;
    storagePath: string;
    createdAt: string;
}
/** Детальная карточка member — совпадает с OpenAPI `CrmMemberFullDto`. */
export type CrmMemberDetails = SchemaCrmMemberFullDto;

export type CrmMemberListFilters = {
    statusItemId?: string;
    filterFieldKey?: string;
    filterValue?: string;
};