"use client";
import { useMutation } from "@tanstack/react-query";
import {
    SchemaRegisterMemberDto,
    SchemaRegisterMemberResponseDto,
    SchemaUploadMemberFilesDto,
    SchemaUploadMemberFilesResponseDto,
} from "@workspace/api-client/core";

import { configureApiClient, ApiAuthType } from "@workspace/api-client/core";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const API_AUTH_TYPE = ApiAuthType.SITE;

const $api = configureApiClient(API_BASE_URL, API_AUTH_TYPE);



export interface RegisterFormSubmitData {
    name: string;
    surname: string;
    email: string;
    phone: string;
    birthday: string;
    documentType: string;
    documentNumber: string;
    password: string;
    repeatPassword: string;
    isMedical: boolean;
    isRecreation: boolean;
    isMj: boolean;
    documentFirst?: File;
    documentSecond?: File;
    signature: string;
}

function toBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
    });
}

async function mapToRegisterMemberDto(data: RegisterFormSubmitData): Promise<SchemaRegisterMemberDto> {
    return {
        email: data.email,
        password: data.password,
        name: data.name,
        surname: data.surname,
        phone: data.phone,
        birthday: data.birthday,
        documentType: data.documentType,
        documentNumber: data.documentNumber,
        isMedical: data.isMedical,
        isMj: data.isMj,
        isRecreation: data.isRecreation,
    };
}

async function mapToUploadMemberFilesDto(data: RegisterFormSubmitData): Promise<SchemaUploadMemberFilesDto> {
    return {
        documentType: data.documentType,
        documentFirst: data.documentFirst ? await toBase64(data.documentFirst) : undefined,
        documentSecond: data.documentSecond ? await toBase64(data.documentSecond) : undefined,
        signature: data.signature,
    };
}

export const useSubmitRegister = () => {
    const registerMutation = useMutation<SchemaRegisterMemberResponseDto, Error, RegisterFormSubmitData>({
        mutationFn: async (data) => {
            const registerPayload = await mapToRegisterMemberDto(data);
            const response = await $api.POST('/lk/auth/member/register', {
                params: {
                    query: {
                        force: "false",
                    },
                },
                body: registerPayload,
            });
            return response.data as SchemaRegisterMemberResponseDto;
        },
    });

    const uploadMutation = useMutation<
        SchemaUploadMemberFilesResponseDto,
        Error,
        { accessToken: string; data: RegisterFormSubmitData }
    >({
        mutationFn: async ({ accessToken, data }) => {
            const filesPayload = await mapToUploadMemberFilesDto(data);
            // For authenticated requests, we need to temporarily set the token
            // The $api middleware will handle it, but we need to set it in storage first
            // Since we're using ApiAuthType.SITE, tokens are stored in site.* keys
            if (typeof window !== "undefined") {
                const previousToken = window.localStorage.getItem("site.accessToken");
                window.localStorage.setItem("site.accessToken", accessToken);
                try {
                    const response = await $api.POST('/lk/auth/member/files', {
                        body: filesPayload,
                    });
                    return response.data as SchemaUploadMemberFilesResponseDto;
                } finally {
                    // Restore previous token or remove if it was null
                    if (previousToken) {
                        window.localStorage.setItem("site.accessToken", previousToken);
                    } else {
                        window.localStorage.removeItem("site.accessToken");
                    }
                }
            } else {
                // Server-side fallback
                const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
                const response = await fetch(`${API_BASE_URL}/lk/auth/member/files`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify(filesPayload),
                });

                if (!response.ok) {
                    throw new Error(`Failed to upload files: ${response.status}`);
                }

                return (await response.json()) as SchemaUploadMemberFilesResponseDto;
            }
        },
    });

    return {
        registerMutation,
        uploadMutation,
    };
};
