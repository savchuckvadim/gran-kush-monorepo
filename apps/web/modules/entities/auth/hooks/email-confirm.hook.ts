"use client";
import { useEffect, useState } from "react";

import { useMutation } from "@tanstack/react-query";

import { confirmEmail } from "../api/auth.api";

export function useEmailConfirm(token: string) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);
    return   useMutation({
        mutationFn: async (token: string) => {
            
            const data = await confirmEmail(token);
           
            return data;
        },
        onSuccess: (data) => {
            // if (data.success) {
            //     toast.success(t("emailConfirmed"));
            // } else {
            //     toast.error(data.message);
            // }
        },
        onError: (error) => {
           
            console.error(error);
           
        },
    });

  
}