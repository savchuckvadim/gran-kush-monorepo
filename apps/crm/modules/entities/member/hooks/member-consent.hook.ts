"use client";

import { useMutation } from "@tanstack/react-query";

import { resendMemberConsent } from "../api/member-consent.api";

export function useResendMemberConsent(memberId: string) {
    return useMutation({ mutationFn: () => resendMemberConsent(memberId) });
}
