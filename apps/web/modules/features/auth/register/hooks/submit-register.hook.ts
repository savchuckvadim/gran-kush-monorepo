"use client";
import { useMutation } from "@tanstack/react-query";

import {
    SchemaDynamicMemberRegistrationDto,
    SchemaRegisterMemberResponseDto,
    SchemaUploadMemberFilesDto,
    SchemaUploadMemberFilesResponseDto,
} from "@workspace/api-client/core";

import { $api } from "@/modules/shared/api";

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

/**
 * Глобальная регистрация аккаунта: { email, password, fields }.
 * fields валидируются схемой public_registration портала (заголовок X-Portal-Slug);
 * документы/подпись уходят отдельным запросом в аккаунт (переиспользуются между клубами).
 */
function mapToRegisterMemberDto(data: RegisterFormSubmitData): SchemaDynamicMemberRegistrationDto {
    return {
        email: data.email,
        password: data.password,
        fields: {
            first_name: data.name,
            last_name: data.surname,
            phone: data.phone,
            birthday: data.birthday,
            is_medical: data.isMedical,
            is_mj: data.isMj,
            is_recreation: data.isRecreation,
            identity_document: { fromAccount: true },
            signature: { fromAccount: true },
        },
    };
}

async function mapToUploadMemberFilesDto(
    data: RegisterFormSubmitData
): Promise<SchemaUploadMemberFilesDto> {
    return {
        documentType: data.documentType,
        documentFirst: data.documentFirst ? await toBase64(data.documentFirst) : undefined,
        documentSecond: data.documentSecond ? await toBase64(data.documentSecond) : undefined,
        signature: data.signature,
    };
}

export const useSubmitRegister = () => {
    const registerMutation = useMutation<
        SchemaRegisterMemberResponseDto,
        Error,
        RegisterFormSubmitData
    >({
        mutationFn: async (data) => {
            const registerPayload = mapToRegisterMemberDto(data);
            const response = await $api.POST("/lk/auth/member/register", {
                body: registerPayload,
            });
            return response.data as SchemaRegisterMemberResponseDto;
        },
    });

    const uploadMutation = useMutation<
        SchemaUploadMemberFilesResponseDto,
        Error,
        RegisterFormSubmitData
    >({
        mutationFn: async (data) => {
            const filesPayload = await mapToUploadMemberFilesDto(data);
            const response = await $api.POST("/lk/auth/member/files", {
                body: filesPayload,
            });
            return response.data as SchemaUploadMemberFilesResponseDto;
        },
    });

    return {
        registerMutation,
        uploadMutation,
    };
};
