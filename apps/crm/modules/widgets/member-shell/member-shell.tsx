"use client";

import { AppFrame } from "@/modules/shared/ui/shell";

import { MemberHeader } from "./member-header";
import { MemberSidebar } from "./member-sidebar";

/**
 * Оболочка кабинета участника — тот же каркас, что у CRM (`AppFrame`, темы, бургер), поэтому у
 * кабинета те же темы и тот же вид. Своё — меню, переключатель клубов и меню аккаунта.
 */
export function MemberShell({ children }: { children: React.ReactNode }) {
    return (
        <AppFrame sidebar={<MemberSidebar />} header={<MemberHeader />}>
            {children}
        </AppFrame>
    );
}
