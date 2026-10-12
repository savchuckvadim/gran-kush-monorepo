import {
    assertOpenApiOk,
    SchemaConfirmMemberConsentDto,
    SchemaDeclineMemberConsentDto,
    SchemaMemberConsentResultDto,
    SchemaPublicMemberConsentInfoDto,
} from "@workspace/api-client/core";

import { $api } from "@/modules/shared";

/** The club, the email and the account's documents behind a consent link; 404 once used or expired. */
export async function getPublicMemberConsent(
    token: string
): Promise<SchemaPublicMemberConsentInfoDto> {
    const response = await $api.GET("/public/consent/{token}", {
        params: { path: { token } },
    });
    return assertOpenApiOk<SchemaPublicMemberConsentInfoDto>(response);
}

export async function confirmMemberConsent(
    token: string,
    body: SchemaConfirmMemberConsentDto
): Promise<SchemaMemberConsentResultDto> {
    const response = await $api.POST("/public/consent/{token}/confirm", {
        params: { path: { token } },
        body,
    });
    return assertOpenApiOk<SchemaMemberConsentResultDto>(response);
}

export async function declineMemberConsent(
    token: string,
    body: SchemaDeclineMemberConsentDto
): Promise<SchemaMemberConsentResultDto> {
    const response = await $api.POST("/public/consent/{token}/decline", {
        params: { path: { token } },
        body,
    });
    return assertOpenApiOk<SchemaMemberConsentResultDto>(response);
}

/** CRM: send the account owner the consent email again (membership still pending). */
export async function resendMemberConsent(memberId: string): Promise<void> {
    const response = await $api.POST("/crm/members/{id}/consent/resend", {
        params: { path: { id: memberId } },
    });
    await assertOpenApiOk(response);
}
