// "use client";
// import { useMutation } from "@tanstack/react-query";

// import {
//     MemberRegistrationSiteService,
//     type RegisterMemberDto,
//     type RegisterMemberResponseDto,
//     type UploadMemberFilesResponseDto,
//     type UploadMemberFilesDto,
// } from "@workspace/api-client/core";

// import { configureOpenApiClient, withAccessToken } from "@/modules/shared/api/api";

// export interface RegisterFormSubmitData {
//     name: string;
//     surname: string;
//     email: string;
//     phone: string;
//     birthday: string;
//     documentType: string;
//     documentNumber: string;
//     password: string;
//     repeatPassword: string;
//     isMedical: boolean;
//     isRecreation: boolean;
//     isMj: boolean;
//     documentFirst?: File;
//     documentSecond?: File;
//     signature: string;
// }

// function toBase64(file: File): Promise<string> {
//     return new Promise((resolve, reject) => {
//         const reader = new FileReader();
//         reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
//         reader.onerror = () => reject(new Error("Failed to read file"));
//         reader.readAsDataURL(file);
//     });
// }

// async function mapToRegisterMemberDto(data: RegisterFormSubmitData): Promise<RegisterMemberDto> {
//     return {
//         email: data.email,
//         password: data.password,
//         name: data.name,
//         surname: data.surname,
//         phone: data.phone,
//         birthday: data.birthday,
//         documentType: data.documentType,
//         documentNumber: data.documentNumber,
//         isMedical: data.isMedical,
//         isMj: data.isMj,
//         isRecreation: data.isRecreation,
//     };
// }

// async function mapToUploadMemberFilesDto(data: RegisterFormSubmitData): Promise<UploadMemberFilesDto> {
//     return {
//         documentType: data.documentType,
//         documentFirst: data.documentFirst ? await toBase64(data.documentFirst) : undefined,
//         documentSecond: data.documentSecond ? await toBase64(data.documentSecond) : undefined,
//         signature: data.signature,
//     };
// }

// export const useSubmitRegister = () => {
//     const registerMutation = useMutation<RegisterMemberResponseDto, Error, RegisterFormSubmitData>({
//         mutationFn: async (data) => {
//             configureOpenApiClient();
//             const registerPayload = await mapToRegisterMemberDto(data);
//             return MemberRegistrationSiteService.membersAuthRegister("false", registerPayload);
//         },
//     });

//     const uploadMutation = useMutation<
//         UploadMemberFilesResponseDto,
//         Error,
//         { accessToken: string; data: RegisterFormSubmitData }
//     >({
//         mutationFn: async ({ accessToken, data }) => {
//             configureOpenApiClient();
//             const filesPayload = await mapToUploadMemberFilesDto(data);
//             return withAccessToken(accessToken, () =>
//                 MemberRegistrationSiteService.membersAuthUploadFiles(filesPayload)
//             );
//         },
//     });

//     return {
//         registerMutation,
//         uploadMutation,
//     };
// };
