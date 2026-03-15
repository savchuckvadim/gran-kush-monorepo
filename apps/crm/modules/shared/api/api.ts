import {
  configureApiClient,
  ApiAuthType,
} from "@workspace/api-client/core";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const API_AUTH_TYPE = ApiAuthType.CRM;

const client = configureApiClient(API_BASE_URL, API_AUTH_TYPE);


export const $api: ReturnType<typeof configureApiClient> = client;

// import {
//     ApiError,
//     type ApiErrorResponseDto,
//     EmployeeAuthenticationCrmService,
//     OpenAPI,
//     type EmployeeRefreshTokenResponseDto,
// } from "@workspace/api-client/generated";

// const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
// const ACCESS_TOKEN_KEY = "crm.accessToken";
// const REFRESH_TOKEN_KEY = "crm.refreshToken";


// let isConfigured = false;
// let refreshPromise: Promise<string | null> | null = null;

// type ApiErrorPayload = ApiErrorResponseDto & {
//     statusCode?: number;
// };

// export class CrmApiError extends Error {
//     constructor(
//         public readonly status: number,
//         message: string,
//         public readonly payload?: ApiErrorPayload
//     ) {
//         super(message);
//         this.name = "CrmApiError";
//     }
// }

// export function isCrmApiError(error: unknown): error is CrmApiError {
//     return error instanceof CrmApiError;
// }

// function canUseBrowserStorage(): boolean {
//     return typeof window !== "undefined";
// }

// export function getAccessToken(): string | null {
//     if (!canUseBrowserStorage()) {
//         return null;
//     }
//     return window.localStorage.getItem(ACCESS_TOKEN_KEY);
// }

// export function getRefreshToken(): string | null {
//     if (!canUseBrowserStorage()) {
//         return null;
//     }
//     return window.localStorage.getItem(REFRESH_TOKEN_KEY);
// }

// export function setSessionTokens(data: { accessToken: string; refreshToken?: string | null }) {
//     if (!canUseBrowserStorage()) {
//         return;
//     }
//     window.localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
//     if (data.refreshToken) {
//         window.localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
//     }
// }

// export function clearSessionTokens() {
//     if (!canUseBrowserStorage()) {
//         return;
//     }
//     window.localStorage.removeItem(ACCESS_TOKEN_KEY);
//     window.localStorage.removeItem(REFRESH_TOKEN_KEY);
// }

// export function configureOpenApiClient() {
//     if (isConfigured) {
//         return;
//     }

//     OpenAPI.BASE = API_BASE_URL;
//     OpenAPI.WITH_CREDENTIALS = true;
//     OpenAPI.CREDENTIALS = "include";
//     OpenAPI.TOKEN = async () => getAccessToken() ?? "";
//     isConfigured = true;
// }

// async function refreshAccessToken(): Promise<string | null> {
//     const refreshToken = getRefreshToken();
//     if (!refreshToken) {
//         return null;
//     }

//     const response = await fetch(`${OpenAPI.BASE}/crm/auth/refresh`, {
//         method: "POST",
//         headers: {
//             "Content-Type": "application/json",
//             Accept: "application/json",
//         },
//         credentials: OpenAPI.CREDENTIALS,
//         body: JSON.stringify({ refreshToken }),
//     });

//     if (!response.ok) {
//         return null;
//     }

//     const payload = (await response.json()) as EmployeeRefreshTokenResponseDto;

//     if (!payload.accessToken) {
//         return null;
//     }

//     setSessionTokens({ accessToken: payload.accessToken });
//     return payload.accessToken;
// }

// export async function callWithRefresh<T>(operation: () => Promise<T>): Promise<T> {
//     configureOpenApiClient();
//     try {
//         return await operation();
//     } catch (error) {
//         const apiError = error as ApiError;
//         const isUnauthorized = apiError?.status === 401;

//         if (!isUnauthorized) {
//             throw error;
//         }

//         if (!refreshPromise) {
//             refreshPromise = refreshAccessToken().finally(() => {
//                 refreshPromise = null;
//             });
//         }

//         const newAccessToken = await refreshPromise;
//         if (!newAccessToken) {
//             clearSessionTokens();
//             throw error;
//         }

//         return operation();
//     }
// }

// export async function withAccessToken<T>(accessToken: string, operation: () => Promise<T>): Promise<T> {
//     configureOpenApiClient();
//     const previousToken = OpenAPI.TOKEN;
//     OpenAPI.TOKEN = accessToken;
//     try {
//         return await operation();
//     } finally {
//         OpenAPI.TOKEN = previousToken;
//     }
// }

// export async function employeeLogout() {
//     const refreshToken = getRefreshToken();
//     if (!refreshToken) {
//         clearSessionTokens();
//         return;
//     }

//     try {
//         await fetch(`${OpenAPI.BASE}/crm/auth/logout`, {
//             method: "POST",
//             headers: {
//                 "Content-Type": "application/json",
//                 Accept: "application/json",
//             },
//             credentials: OpenAPI.CREDENTIALS,
//             body: JSON.stringify({ refreshToken }),
//         });
//     } finally {
//         clearSessionTokens();
//     }
// }

// export async function employeeGetMe() {
//     return callWithRefresh(() => EmployeeAuthenticationCrmService.employeeAuthGetMe());
// }

// function buildAuthHeaders(initHeaders?: HeadersInit): Headers {
//     const headers = new Headers(initHeaders);
//     headers.set("Accept", "application/json");

//     const token = getAccessToken();
//     if (token) {
//         headers.set("Authorization", `Bearer ${token}`);
//     }

//     if (!headers.has("Content-Type")) {
//         headers.set("Content-Type", "application/json");
//     }

//     return headers;
// }

// export function getApiBaseUrl(): string {
//     configureOpenApiClient();
//     return OpenAPI.BASE;
// }

// export async function apiFetchJsonWithRefresh<T>(path: string, init?: RequestInit): Promise<T> {
//     configureOpenApiClient();

//     const execute = async (): Promise<Response> =>
//         fetch(`${OpenAPI.BASE}${path}`, {
//             ...init,
//             headers: buildAuthHeaders(init?.headers),
//             credentials: OpenAPI.CREDENTIALS,
//         });

//     let response = await execute();

//     if (response.status === 401) {
//         const refreshed = await refreshAccessToken();
//         if (refreshed) {
//             response = await execute();
//         }
//     }

//     if (!response.ok) {
//         let payload: ApiErrorPayload | undefined;
//         try {
//             payload = (await response.json()) as ApiErrorPayload;
//         } catch {
//             payload = undefined;
//         }

//         const messageFromPayload = Array.isArray(payload?.message)
//             ? payload.message.join(", ")
//             : payload?.message;

//         throw new CrmApiError(
//             response.status,
//             messageFromPayload || `Request failed: ${response.status}`,
//             payload
//         );
//     }

//     return (await response.json()) as T;
// }
