"use client";

import { useMutation } from "@tanstack/react-query";

import { requestIdentityEmail, verifyWidgetSignIn } from "../api/identity-auth.api";

export function useWidgetSignIn() {
    return useMutation({ mutationFn: verifyWidgetSignIn });
}

export function useRequestIdentityEmail() {
    return useMutation({ mutationFn: requestIdentityEmail });
}
