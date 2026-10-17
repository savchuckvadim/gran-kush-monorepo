"use client";

import { useTranslations } from "next-intl";

import { usePermissions } from "@/modules/entities/access";
import { CreateInvitationForm } from "@/modules/features/invitations";
import { ListPage } from "@/modules/shared/ui/ListPage";
import { InvitationsList } from "@/modules/widgets/invitations";

export function InvitationsSettingsPage() {
    const t = useTranslations("crm.invitations");
    const { can } = usePermissions();
    const canManage = can("employees.manage");

    return (
        <ListPage
            title={t("title")}
            description={t("subtitle")}
            create={
                canManage
                    ? {
                          label: t("create.button"),
                          title: t("create.title"),
                          description: t("create.description"),
                          size: "md",
                          form: ({ close }) => <CreateInvitationForm onDone={close} />,
                      }
                    : undefined
            }
        >
            <InvitationsList />
        </ListPage>
    );
}
