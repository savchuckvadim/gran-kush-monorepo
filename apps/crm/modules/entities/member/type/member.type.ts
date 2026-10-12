import {
    SchemaCrmMemberAccountDocumentDto,
    SchemaCrmMemberDto,
    SchemaCrmMemberFullDto,
    SchemaPaginatedResponseCrmMemberDto,
} from "@workspace/api-client/core";

import type { EntityFieldCondition } from "@/modules/shared/ui/EntityFilter";

export type CrmMemberListItem = SchemaCrmMemberDto;
/** Документ аккаунта (паспорт/ID) — совпадает с OpenAPI `CrmMemberAccountDocumentDto`. */
export type IdentityDocument = SchemaCrmMemberAccountDocumentDto;
export interface IMemberSignature {
    id: string;
    createdAt: string;
}
/** Детальная карточка member — совпадает с OpenAPI `CrmMemberFullDto`. */
export type CrmMemberDetails = SchemaCrmMemberFullDto;

/** A page of the CRM members list: `q` searches the text fields, email and number. */
export type CrmMemberListParams = {
    page: number;
    limit: number;
    q?: string;
    statusItemId?: string;
    conditions?: EntityFieldCondition[];
};

export type CrmMemberListPage = SchemaPaginatedResponseCrmMemberDto;
