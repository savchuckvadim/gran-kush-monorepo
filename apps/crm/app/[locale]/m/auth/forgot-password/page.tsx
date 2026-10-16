import { MemberAuthCard, MemberForgotPasswordForm } from "@/modules/features/member-auth";

export default function MemberForgotPasswordPage() {
    return (
        <MemberAuthCard section="forgot">
            <MemberForgotPasswordForm />
        </MemberAuthCard>
    );
}
