"use client";

import { type CSSProperties, useState, useSyncExternalStore } from "react";
import { useLocale, useTranslations } from "next-intl";

import { type PlanView, recommendPlan, withVat } from "@/modules/entities/plan/model";
import { DEFAULT_LOCALE, isLocale } from "@/modules/shared/config/locales";
import { crmHref } from "@/modules/shared/config/routes";

import { LiquidButton } from "../ui/liquid-button";

const BILLING_KEY = "pafpaf.yearly";
const BILLING_EVENT = "pafpaf:billing";
let memoryYearly = false;

const readYearly = () => {
    try {
        const stored = localStorage.getItem(BILLING_KEY);
        return stored === null ? memoryYearly : stored === "1";
    } catch {
        return memoryYearly;
    }
};

const subscribeBilling = (callback: () => void) => {
    window.addEventListener(BILLING_EVENT, callback);
    return () => window.removeEventListener(BILLING_EVENT, callback);
};

// Monthly / yearly as a liquid segmented control: the thumb stretches into a drop while it moves.
const Segmented = ({
    yearly,
    onChange,
}: {
    yearly: boolean;
    onChange: (yearly: boolean) => void;
}) => {
    const t = useTranslations();
    return (
        <div
            className="lseg glass"
            role="group"
            aria-label={t("a11y.billing")}
            data-val={yearly ? "1" : "0"}
        >
            <div className="lseg__goo" aria-hidden="true">
                <span className="lseg__thumb" />
                <span className="lseg__drop" />
            </div>
            <button type="button" aria-pressed={!yearly} onClick={() => onChange(false)}>
                {t("pricing.monthly")}
            </button>
            <button type="button" aria-pressed={yearly} onClick={() => onChange(true)}>
                {t("pricing.yearly")}
            </button>
        </div>
    );
};

// Shared by the teaser and the full table; the server always renders monthly prices.
const useBilling = () => {
    const yearly = useSyncExternalStore(subscribeBilling, readYearly, () => false);
    const setYearly = (next: boolean) => {
        memoryYearly = next;
        try {
            localStorage.setItem(BILLING_KEY, next ? "1" : "0");
        } catch {
            // private mode: the choice lives only in memory
        }
        window.dispatchEvent(new Event(BILLING_EVENT));
    };
    return { yearly, setYearly };
};

const useMoney = () => {
    const locale = useLocale();
    return (value: number) =>
        new Intl.NumberFormat(locale, {
            style: "currency",
            currency: "EUR",
            maximumFractionDigits: value % 1 ? 2 : 0,
        }).format(value);
};

const Price = ({ plan, yearly }: { plan: PlanView; yearly: boolean }) => {
    const t = useTranslations("pricing");
    const money = useMoney();
    const value = yearly ? plan.yearly : plan.monthly;
    if (value === null) return null;
    return (
        <div className="plan__price">
            {money(value)}
            <small>{t("perMonth")}</small>
        </div>
    );
};

export const PricingTeaserPlans = ({ plans }: { plans: PlanView[] }) => {
    const { yearly, setYearly } = useBilling();
    return (
        <>
            <div style={{ marginTop: 36 }}>
                <Segmented yearly={yearly} onChange={setYearly} />
            </div>
            <div className="plans">
                {plans.map((plan, index) => (
                    <article
                        key={plan.code}
                        className={`plan glass reveal${index ? ` d${index}` : ""}`}
                    >
                        <h3>{plan.name}</h3>
                        <p className="plan__for">{plan.forWhom}</p>
                        <Price plan={plan} yearly={yearly} />
                    </article>
                ))}
            </div>
        </>
    );
};

export const PricingCalculator = ({
    plans,
    defaultMembers,
}: {
    plans: PlanView[];
    defaultMembers: number;
}) => {
    const t = useTranslations("pricing");
    const locale = useLocale();
    const siteLocale = isLocale(locale) ? locale : DEFAULT_LOCALE;
    const money = useMoney();
    const { yearly, setYearly } = useBilling();
    const [members, setMembers] = useState(defaultMembers);
    const reco = recommendPlan(plans, members);
    const number = new Intl.NumberFormat(locale);
    const min = 30;
    const max = 3000;

    return (
        <>
            <div className="fade-late" style={{ marginTop: 40 }}>
                <Segmented yearly={yearly} onChange={setYearly} />
            </div>
            <div className="calc glass fade-late">
                <label htmlFor="members">
                    <span>{t("members")}</span>
                    <output htmlFor="members">{number.format(members)}</output>
                </label>
                <input
                    className="lrange"
                    type="range"
                    id="members"
                    min={min}
                    max={max}
                    step={10}
                    value={members}
                    onChange={(event) => setMembers(Number(event.target.value))}
                    style={
                        { "--pct": `${((members - min) / (max - min)) * 100}%` } as CSSProperties
                    }
                />
                {reco && (
                    <p aria-live="polite">
                        {t.rich("reco", {
                            n: number.format(members),
                            plan: reco.name,
                            b: (chunks) => <b>{chunks}</b>,
                        })}
                    </p>
                )}
            </div>
            <div className="plans">
                {plans.map((plan) => {
                    const value = yearly ? plan.yearly : plan.monthly;
                    const isReco = reco?.code === plan.code;
                    return (
                        <article
                            key={plan.code}
                            className={`plan glass${isReco ? " is-reco" : ""}`}
                        >
                            <div className="plan__tag">
                                {isReco && <span className="plan__badge">{t("badge")}</span>}
                            </div>
                            <h3>{plan.name}</h3>
                            <p className="plan__for">{plan.forWhom}</p>
                            <Price plan={plan} yearly={yearly} />
                            {value !== null && (
                                <p className="plan__vat">
                                    {t("vat", { value: money(withVat(value)) })}
                                </p>
                            )}
                            <ul>
                                {plan.features.map((feature) => (
                                    <li key={feature}>{feature}</li>
                                ))}
                            </ul>
                            <LiquidButton
                                href={crmHref(
                                    siteLocale,
                                    "register",
                                    yearly ? plan.yearlyCode : plan.monthlyCode
                                )}
                                variant={plan.highlight ? "primary" : "glass"}
                            >
                                {t("choose", { plan: plan.name })}
                            </LiquidButton>
                        </article>
                    );
                })}
            </div>
        </>
    );
};
