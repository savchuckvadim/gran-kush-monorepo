"use client";
import { useMutation } from "@tanstack/react-query";

import {
    SchemaRegisterMemberDto,
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

async function mapToRegisterMemberDto(
    data: RegisterFormSubmitData
): Promise<SchemaRegisterMemberDto> {
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
            const registerPayload = await mapToRegisterMemberDto(data);
            const response = await $api.POST("/lk/auth/member/register", {
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
