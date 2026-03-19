"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2 } from "lucide-react";
import { FieldErrors, useForm } from "react-hook-form";
import { z } from "zod";

import {
    Button,
    FieldInput,
    FileUpload,
    SignatureCanvasField,
} from "@workspace/ui";
import { Field, FieldContent, FieldLabel } from "@workspace/ui/components/field";

import {
    RegisterFormSubmitData,
    useSubmitRegister,
} from "@/modules/features/auth/register/hooks/submit-register.hook";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

const registrationSchema = z
    .object({
        name: z.string().min(2, "Name must be at least 2 characters"),
        surname: z.string().min(2, "Surname must be at least 2 characters"),
        email: z.string().email("Invalid email"),
        phone: z.string().min(10, "Phone must be at least 10 characters"),
        birthday: z.string().min(1, "Birthday is required"),
        documentType: z.string().min(1, "Document type is required"),
        documentNumber: z.string().min(1, "Document number is required"),
        password: z.string().min(8, "Password must be at least 8 characters"),
        repeatPassword: z.string(),
        isMedical: z.boolean().default(false),
        isRecreation: z.boolean().default(false),
        isMj: z.boolean().default(false),
        documentFirst: z.instanceof(File).optional(),
        documentSecond: z.instanceof(File).optional(),
        signature: z.string().min(1, "Signature is required"),
    })
    .refine((data) => data.password === data.repeatPassword, {
        message: "Passwords don't match",
        path: ["repeatPassword"],
    })
    .refine((data) => data.isMedical || data.isRecreation, {
        message: "Specify the type of consumption",
        path: ["isMedical"],
    });

type RegistrationFormValues = z.input<typeof registrationSchema>;
type RegistrationFormData = z.output<typeof registrationSchema>;

export function RegistrationForm() {
    const t = useTranslations("auth.register");
    const localizedLink = useLocalizedLink();
    const router = useRouter();
    const [documentFirst, setDocumentFirst] = useState<File | null>(null);
    const [documentSecond, setDocumentSecond] = useState<File | null>(null);
    const [signature, setSignature] = useState<string | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [scrollRequest, setScrollRequest] = useState<{
        id: number;
        target: keyof RegistrationFormData | "serverError";
    } | null>(null);
    const [step, setStep] = useState<"form" | "registering" | "uploading" | "uploadError">("form");
    const [pendingUpload, setPendingUpload] = useState<{
        data: RegisterFormSubmitData;
        email: string;
    } | null>(null);

    const {
        register,
        handleSubmit,
        setValue,
        setFocus,
        formState: { errors, isSubmitting },
    } = useForm<RegistrationFormValues, undefined, RegistrationFormData>({
        resolver: zodResolver(registrationSchema),
        defaultValues: {
            isMedical: false,
            isRecreation: false,
            isMj: false,
        },
    });

    const { registerMutation, uploadMutation } = useSubmitRegister();
    const formRef = useRef<HTMLFormElement | null>(null);
    const serverErrorRef = useRef<HTMLDivElement | null>(null);
    const signatureFieldRef = useRef<HTMLDivElement | null>(null);
    const mjFieldRef = useRef<HTMLDivElement | null>(null);

    const showToast = (message: string) => {
        setToastMessage(message);
    };

    useEffect(() => {
        if (!toastMessage) {
            return;
        }
        const timeout = setTimeout(() => setToastMessage(null), 4000);
        return () => clearTimeout(timeout);
    }, [toastMessage]);

    const triggerScrollTo = (target: keyof RegistrationFormData | "serverError") =>
        setScrollRequest((prev) => ({ id: (prev?.id ?? 0) + 1, target }));

    useEffect(() => {
        if (!scrollRequest) {
            return;
        }
        const scrollTarget = scrollRequest.target;

        if (scrollTarget === "serverError") {
            serverErrorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }

        const fieldElement = formRef.current?.querySelector(`[name="${String(scrollTarget)}"]`) as HTMLElement | null;
        if (fieldElement) {
            fieldElement.scrollIntoView({ behavior: "smooth", block: "center" });
            if (scrollTarget !== "isMedical" && scrollTarget !== "isRecreation") {
                setTimeout(() => setFocus(scrollTarget), 150);
            }
            return;
        }

        if (scrollTarget === "signature") {
            signatureFieldRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }

        if (scrollTarget === "isMedical" || scrollTarget === "isRecreation" || scrollTarget === "isMj") {
            mjFieldRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }, [scrollRequest, setFocus]);

    const getFirstErrorField = (formErrors: FieldErrors<RegistrationFormData>): keyof RegistrationFormData | null => {
        const fieldsOrder: (keyof RegistrationFormData)[] = [
            "name",
            "surname",
            "email",
            "phone",
            "birthday",
            "documentType",
            "documentNumber",
            "documentFirst",
            "documentSecond",
            "signature",
            "password",
            "repeatPassword",
            "isMedical",
            "isRecreation",
            "isMj",
        ];

        return fieldsOrder.find((field) => !!formErrors[field]) ?? null;
    };

    const onSubmit = async (data: RegistrationFormData) => {
        const payload: RegisterFormSubmitData = {
            ...data,
            documentFirst: documentFirst ?? data.documentFirst,
            documentSecond: documentSecond ?? data.documentSecond,
            signature: signature ?? data.signature,
        };

        try {
            setStep("registering");
            await registerMutation.mutateAsync(payload);
        } catch {
            setStep("form");
            const message = t("error") || "Registration failed. Please try again.";
            showToast(message);
            triggerScrollTo("serverError");
            return;
        }

        setPendingUpload({
            data: payload,
            email: payload.email,
        });

        try {
            setStep("uploading");
            await uploadMutation.mutateAsync(payload);
        } catch {
            setStep("uploadError");
            return;
        }

        router.push(localizedLink(`${ROUTES.CONFIRM_EMAIL}?email=${encodeURIComponent(payload.email)}`));
    };

    const onInvalid = (formErrors: FieldErrors<RegistrationFormData>) => {
        const firstErrorField = getFirstErrorField(formErrors);
        if (firstErrorField) {
            triggerScrollTo(firstErrorField);
        }
        showToast(t("validationError") || "Please correct highlighted fields.");
    };

    const retryUpload = async () => {
        if (!pendingUpload) {
            return;
        }

        try {
            setStep("uploading");
            await uploadMutation.mutateAsync(pendingUpload.data);
            router.push(
                localizedLink(`${ROUTES.CONFIRM_EMAIL}?email=${encodeURIComponent(pendingUpload.email)}`)
            );
        } catch {
            setStep("uploadError");
        }
    };

    if (step === "registering" || step === "uploading") {
        return (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 text-center">
                <Loader2 className="size-8 animate-spin text-primary" />
                <h3 className="text-lg font-semibold">
                    {step === "registering"
                        ? t("status.creatingAccountTitle")
                        : t("status.uploadingDocumentsTitle")}
                </h3>
                <p className="max-w-md text-sm text-muted-foreground">
                    {step === "registering"
                        ? t("status.creatingAccountDescription")
                        : t("status.uploadingDocumentsDescription")}
                </p>
            </div>
        );
    }

    if (step === "uploadError") {
        return (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 text-center">
                <AlertCircle className="size-8 text-destructive" />
                <h3 className="text-lg font-semibold">{t("status.uploadErrorTitle")}</h3>
                <p className="max-w-md text-sm text-muted-foreground">
                    {t("status.uploadErrorDescription")}
                </p>
                <div className="flex w-full max-w-sm flex-col gap-2">
                    <Button type="button" onClick={retryUpload} disabled={uploadMutation.isPending}>
                        {uploadMutation.isPending ? t("status.retrying") : t("status.retryUpload")}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setStep("form")}
                        disabled={uploadMutation.isPending}
                    >
                        {t("status.backToForm")}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <>
            {toastMessage && (
                <div className="fixed inset-x-4 bottom-4 z-50 md:inset-x-auto md:right-4 md:max-w-sm" aria-live="polite">
                    <div className="rounded-lg border border-destructive bg-background p-3 text-sm text-foreground shadow-lg">
                        {toastMessage}
                    </div>
                </div>
            )}

            <form ref={formRef} onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
            {registerMutation.isError && (
                <div
                    ref={serverErrorRef}
                    className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
                >
                    {t("error") || "Registration failed. Please try again."}
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
                <FieldInput
                    label={t("name")}
                    type="text"
                    error={errors.name?.message}
                    required
                    {...register("name")}
                    placeholder="John"
                />

                <FieldInput
                    label={t("surname")}
                    type="text"
                    error={errors.surname?.message}
                    required
                    {...register("surname")}
                    placeholder="Doe"
                />
            </div>

            <FieldInput
                label={t("email")}
                type="email"
                error={errors.email?.message}
                required
                {...register("email")}
                placeholder="your.email@example.com"
            />

            <div className="grid gap-4 md:grid-cols-2">
                <FieldInput
                    label={t("phone")}
                    type="tel"
                    error={errors.phone?.message}
                    required
                    {...register("phone")}
                    placeholder="+1234567890"
                />

                <FieldInput
                    label={t("birthday")}
                    type="date"
                    error={errors.birthday?.message}
                    required
                    {...register("birthday")}
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <FieldInput
                    label={t("documentType")}
                    type="text"
                    error={errors.documentType?.message}
                    required
                    {...register("documentType")}
                    placeholder="Passport"
                />

                <FieldInput
                    label={t("documentNumber")}
                    type="text"
                    error={errors.documentNumber?.message}
                    required
                    {...register("documentNumber")}
                    placeholder="123456789"
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <FileUpload
                    label={t("documentFirst")}
                    value={documentFirst}
                    onChange={(file) => {
                        setDocumentFirst(file);
                        if (file) setValue("documentFirst", file);
                    }}
                    error={errors.documentFirst?.message}
                    required
                    accept="image/*"
                />

                <FileUpload
                    label={t("documentSecond")}
                    value={documentSecond}
                    onChange={(file) => {
                        setDocumentSecond(file);
                        if (file) setValue("documentSecond", file);
                    }}
                    error={errors.documentSecond?.message}
                    required
                    accept="image/*"
                />
            </div>

            <Field>
                <FieldLabel>{t("signature")}</FieldLabel>
                <FieldContent ref={signatureFieldRef}>
                    <SignatureCanvasField
                        value={signature || undefined}
                        onChange={(value) => {
                            setSignature(value);
                            if (value) setValue("signature", value);
                        }}
                        error={!!errors.signature}
                    />
                    {errors.signature && (
                        <p className="text-sm text-destructive">{errors.signature.message}</p>
                    )}
                </FieldContent>
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
                <FieldInput
                    label={t("password")}
                    type="password"
                    error={errors.password?.message}
                    required
                    {...register("password")}
                    placeholder="••••••••"
                />

                <FieldInput
                    label={t("repeatPassword")}
                    type="password"
                    error={errors.repeatPassword?.message}
                    required
                    {...register("repeatPassword")}
                    placeholder="••••••••"
                />
            </div>

            <Field>
                <FieldLabel>{t("isMj")}</FieldLabel>
                <FieldContent ref={mjFieldRef}>
                    <div className="space-y-3">
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                {...register("isMedical")}
                                className="rounded border-input"
                            />
                            <span className="text-sm">{t("isMedical")}</span>
                        </label>
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                {...register("isRecreation")}
                                className="rounded border-input"
                            />
                            <span className="text-sm">{t("isRecreation")}</span>
                        </label>
                        {errors.isMedical && (
                            <p className="text-sm text-destructive">{errors.isMedical.message}</p>
                        )}
                    </div>
                </FieldContent>
            </Field>

            <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || registerMutation.isPending || uploadMutation.isPending}
            >
                {isSubmitting || registerMutation.isPending ? t("submitting") : t("submit")}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
                {t("privacy")}{" "}
                <Link href={localizedLink(ROUTES.TERMS)} className="text-primary hover:underline">
                    {t("terms")}
                </Link>{" "}
                {t("and")}{" "}
                <Link href={localizedLink(ROUTES.PRIVACY)} className="text-primary hover:underline">
                    {t("privacyPolicy")}
                </Link>
            </div>

            <div className="text-center text-sm text-muted-foreground">
                {t("hasAccount")}{" "}
                <Link href={localizedLink(ROUTES.LOGIN)} className="text-primary hover:underline">
                    {t("login")}
                </Link>
            </div>
            </form>
        </>
    );
}
