export interface PlanView {
    code: "calada" | "club" | "cadena";
    name: string;
    forWhom: string;
    features: string[];
    maxMembers: number | null;
    highlight: boolean;
    monthly: number | null;
    yearly: number | null;
    // API billing codes ("club-month"): the sign-up link hands the chosen one to the CRM
    monthlyCode: string | null;
    yearlyCode: string | null;
}

export const VAT_RATE = 0.21;

export const withVat = (amount: number) => Math.round(amount * (1 + VAT_RATE) * 100) / 100;

export const recommendPlan = (plans: PlanView[], members: number): PlanView | undefined =>
    plans.find((plan) => plan.maxMembers === null || members <= plan.maxMembers) ??
    plans[plans.length - 1];
