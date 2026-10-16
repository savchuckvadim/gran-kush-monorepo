/** Who the client speaks for: an employee in the CRM or a member in the cabinet. */
export enum ApiAuthType {
    CRM = "crm",
    CABINET = "cabinet",
}

/** Refresh endpoint of each principal; the API mounts them under the same prefixes. */
export const REFRESH_PATH: Record<ApiAuthType, string> = {
    [ApiAuthType.CRM]: "/crm/auth/refresh",
    [ApiAuthType.CABINET]: "/cabinet/auth/refresh",
};
