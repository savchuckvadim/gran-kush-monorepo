import { useTranslations } from "next-intl";

import {  useLoginSchema } from "./useLoginSchema";;
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { LoginFormData } from "../type/login-form.type";


export function useLoginForm() {
    const loginSchema = useLoginSchema();
    const t = useTranslations("auth.login");
    
    const {
        register,
        handleSubmit,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    });
    return {
        loginSchema,
        t,
      
   
        register,
        handleSubmit,
        setError,
        errors,
        isSubmitting
    };
}