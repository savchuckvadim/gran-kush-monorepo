"use client";

import { type FormEvent, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Check, Loader2, Send } from "lucide-react";

import { LEAD_ENDPOINT } from "@/modules/shared/config/routes";
import { CONTACT_EMAIL } from "@/modules/shared/config/site";
import { Link } from "@/modules/shared/i18n/navigation";

import { LEAD_BUDGETS, LEAD_LIMITS, LEAD_SERVICES, leadSchema } from "./schema";

type Status = "idle" | "sending" | "sent" | "invalid" | "too_many" | "unavailable";

const FIELD =
    "w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring";

/** The request form: validated with the same schema the endpoint uses, posted as JSON. */
export const LeadForm = () => {
    const t = useTranslations("contact.form");
    const locale = useLocale();
    const [status, setStatus] = useState<Status>("idle");

    const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = Object.fromEntries(new FormData(form).entries());
        const parsed = leadSchema.safeParse({ ...data, consent: data.consent === "on", locale });
        if (!parsed.success) {
            setStatus("invalid");
            return;
        }
        setStatus("sending");
        try {
            const response = await fetch(LEAD_ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(parsed.data),
            });
            if (response.ok) {
                setStatus("sent");
                form.reset();
                return;
            }
            setStatus(response.status === 429 ? "too_many" : "unavailable");
        } catch {
            setStatus("unavailable");
        }
    };

    if (status === "sent") {
        return (
            <div className="surface flex flex-col items-start gap-3 p-8">
                <span className="grid size-10 place-items-center rounded-full bg-success/15 text-success">
                    <Check className="size-5" />
                </span>
                <h3 className="text-xl">{t("sentTitle")}</h3>
                <p className="text-sm text-muted-foreground">{t("sentText")}</p>
            </div>
        );
    }

    return (
        <form onSubmit={onSubmit} className="surface grid gap-4 p-6 md:p-8" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm">
                    {t("name")}
                    <input name="name" required maxLength={LEAD_LIMITS.name} className={FIELD} />
                </label>
                <label className="grid gap-1.5 text-sm">
                    {t("email")}
                    <input
                        name="email"
                        type="email"
                        required
                        maxLength={LEAD_LIMITS.contact}
                        className={FIELD}
                    />
                </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
                <label className="grid gap-1.5 text-sm">
                    {t("phone")}
                    <input name="phone" maxLength={LEAD_LIMITS.contact} className={FIELD} />
                </label>
                <label className="grid gap-1.5 text-sm">
                    {t("service")}
                    <select name="service" className={FIELD} defaultValue="web">
                        {LEAD_SERVICES.map((item) => (
                            <option key={item} value={item}>
                                {t(`services.${item}`)}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="grid gap-1.5 text-sm">
                    {t("budget")}
                    <select name="budget" className={FIELD} defaultValue="unknown">
                        {LEAD_BUDGETS.map((item) => (
                            <option key={item} value={item}>
                                {t(`budgets.${item}`)}
                            </option>
                        ))}
                    </select>
                </label>
            </div>
            <label className="grid gap-1.5 text-sm">
                {t("message")}
                <textarea
                    name="message"
                    required
                    rows={5}
                    maxLength={LEAD_LIMITS.message}
                    placeholder={t("messagePlaceholder")}
                    className={`${FIELD} resize-y`}
                />
            </label>
            <input
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden
                className="absolute -left-[9999px] h-0 w-0 opacity-0"
            />
            <label className="flex items-start gap-3 text-xs text-muted-foreground">
                <input name="consent" type="checkbox" required className="mt-0.5 accent-primary" />
                <span>
                    {t.rich("consent", {
                        link: (chunks) => (
                            <Link href="/legal/privacidad" className="underline underline-offset-2">
                                {chunks}
                            </Link>
                        ),
                    })}
                </span>
            </label>
            {status === "invalid" ? (
                <p className="text-sm text-destructive">{t("invalid")}</p>
            ) : null}
            {status === "too_many" ? (
                <p className="text-sm text-destructive">{t("tooMany")}</p>
            ) : null}
            {status === "unavailable" ? (
                <p className="text-sm text-destructive">
                    {t("unavailable", { email: CONTACT_EMAIL })}
                </p>
            ) : null}
            <button
                type="submit"
                disabled={status === "sending"}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 font-medium text-primary-foreground transition-transform hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100"
            >
                {status === "sending" ? (
                    <Loader2 className="size-4 animate-spin" />
                ) : (
                    <Send className="size-4" />
                )}
                {t("submit")}
            </button>
        </form>
    );
};
