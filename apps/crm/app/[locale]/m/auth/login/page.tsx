import { Suspense } from "react";

import { MemberAuthCard, MemberLoginForm } from "@/modules/features/member-auth";

export default function MemberLoginPage() {
    return (
        <MemberAuthCard section="login">
            {/* useSearchParams внутри формы требует границы Suspense */}
            <Suspense>
                <MemberLoginForm />
            </Suspense>
        </MemberAuthCard>
    );
}
