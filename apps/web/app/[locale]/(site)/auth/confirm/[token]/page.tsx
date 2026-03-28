"use client";

import { useEffect } from "react";
import { redirect, useParams } from "next/navigation";

import { useEmailConfirm } from "@/modules/entities/auth";
import { ROUTES, useLocalizedLink } from "@/modules/shared";

export default function ConfirmEmailPage() {
    const params = useParams();
    const token = params.token as string;
    const localizedLink = useLocalizedLink();
    const { data, isPending, error, mutate: confirmEmailMutation } = useEmailConfirm(token);

    useEffect(() => {
        confirmEmailMutation(token);
    }, [token]);

    if (isPending) {
        return <div>Loading...</div>;
    }

    if (data && data.success) {
        redirect(localizedLink(ROUTES.LOGIN));
    }
    if (error) {
        return <div>Email not confirmed. Error: {error.message}</div>;
    }

    if (data && !data.success) {
        return <div>Email not confirmed {data.message}</div>;
    }

    return <div>Email confirmation </div>;
}
