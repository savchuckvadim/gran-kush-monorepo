"use client";
import { useMutation } from "@tanstack/react-query";

import { confirmEmail } from "../api/auth.api";

export function useEmailConfirm(token: string) {
    return useMutation({
        mutationFn: () => confirmEmail(token),
    });
}
