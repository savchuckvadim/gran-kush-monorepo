"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Pencil } from "lucide-react";

import { Button, FieldInput } from "@workspace/ui";

import { CrmMemberDetails, useMemberStatusItems, useUpdateCrmMember } from "@/modules/entities/member";

interface MemberProfileEditModalProps {
    member: CrmMemberDetails;
}

export function MemberProfileEditModal({ member }: MemberProfileEditModalProps) {
    const t = useTranslations("crm.members.editor");
    const router = useRouter();
    const pathname = usePathname();
    const updateMemberMutation = useUpdateCrmMember();
    const [isOpen, setIsOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const initialStatuses = useMemo(
        () => ({
            isMedical: member.mjStatuses.some((status) => status.code === "medical"),
            isMj: member.mjStatuses.some((status) => status.code === "mj"),
            isRecreation: member.mjStatuses.some((status) => status.code === "recreation"),
        }),
        [member.mjStatuses]
    );

    const [profileForm, setProfileForm] = useState({
        firstName: member.name,
        lastName: member.surname ?? "",
        phone: member.phone ?? "",
        birthday: member.birthday ? member.birthday.slice(0, 10) : "",
        membershipNumber: member.membershipNumber ?? "",
        address: member.address ?? "",
        statusItemId: member.statusItem?.id ?? "",
        notes: member.notes ?? "",
        documentType: member.documents[0]?.type ?? "",
        documentNumber: member.documents[0]?.number ?? "",
        ...initialStatuses,
    });

    const statusQuery = useMemberStatusItems(isOpen);

    useEffect(() => {
        if (!isOpen) {
            return;
        }
        setProfileForm({
            firstName: member.name,
            lastName: member.surname ?? "",
            phone: member.phone ?? "",
            birthday: member.birthday ? member.birthday.slice(0, 10) : "",
            membershipNumber: member.membershipNumber ?? "",
            address: member.address ?? "",
            statusItemId: member.statusItem?.id ?? "",
            notes: member.notes ?? "",
            documentType: member.documents[0]?.type ?? "",
            documentNumber: member.documents[0]?.number ?? "",
            ...initialStatuses,
        });
    }, [isOpen, member, initialStatuses]);

    const handleSave = async () => {
        setError(null);
        try {
            await updateMemberMutation.mutateAsync({
                memberId: member.id,
                payload: {
                    membershipNumber: profileForm.membershipNumber || null,
                    statusItemId: profileForm.statusItemId || undefined,
                    fields: {
                        first_name: profileForm.firstName,
                        last_name: profileForm.lastName || undefined,
                        phone: profileForm.phone || undefined,
                        birthday: profileForm.birthday || undefined,
                        address: profileForm.address || undefined,
                        notes: profileForm.notes || undefined,
                        document_type: profileForm.documentType || undefined,
                        document_number: profileForm.documentNumber || undefined,
                        is_medical: profileForm.isMedical,
                        is_mj: profileForm.isMj,
                        is_recreation: profileForm.isRecreation,
                    },
                },
            });
            setIsOpen(false);
            router.push(pathname);
            router.refresh();
        } catch {
            setError(t("saveError"));
        }
    };

    return (
        <>
            <Button
                size="icon"
                variant="outline"
                onClick={() => setIsOpen(true)}
                aria-label={t("startEdit")}
            >
                <Pencil className="h-4 w-4" />
            </Button>

            {isOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border bg-background p-4">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <h2 className="text-base font-medium">{t("title")}</h2>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setError(null);
                                    setIsOpen(false);
                                }}
                            >
                                {t("cancelEdit")}
                            </Button>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                            <FieldInput
                                label={t("fields.name")}
                                value={profileForm.firstName}
                                onChange={(e) =>
                                    setProfileForm((prev) => ({ ...prev, firstName: e.target.value }))
                                }
                            />
                            <FieldInput
                                label={t("fields.surname")}
                                value={profileForm.lastName}
                                onChange={(e) =>
                                    setProfileForm((prev) => ({ ...prev, lastName: e.target.value }))
                                }
                            />
                            <FieldInput
                                label={t("fields.phone")}
                                value={profileForm.phone}
                                onChange={(e) =>
                                    setProfileForm((prev) => ({ ...prev, phone: e.target.value }))
                                }
                            />
                            <FieldInput
                                label={t("fields.birthday")}
                                type="date"
                                value={profileForm.birthday}
                                onChange={(e) =>
                                    setProfileForm((prev) => ({
                                        ...prev,
                                        birthday: e.target.value,
                                    }))
                                }
                            />
                            <FieldInput
                                label={t("fields.membershipNumber")}
                                value={profileForm.membershipNumber}
                                onChange={(e) =>
                                    setProfileForm((prev) => ({
                                        ...prev,
                                        membershipNumber: e.target.value,
                                    }))
                                }
                            />
                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-medium">{t("fields.status")}</label>
                                <select
                                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                                    value={profileForm.statusItemId}
                                    onChange={(e) =>
                                        setProfileForm((prev) => ({
                                            ...prev,
                                            statusItemId: e.target.value,
                                        }))
                                    }
                                    disabled={statusQuery.isPending || statusQuery.isError || statusQuery.isLoading}
                                >
                                    <option value="">—</option>
                                    {(statusQuery.data ?? []).map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <FieldInput
                                label={t("fields.documentType")}
                                value={profileForm.documentType}
                                onChange={(e) =>
                                    setProfileForm((prev) => ({
                                        ...prev,
                                        documentType: e.target.value,
                                    }))
                                }
                            />
                            <FieldInput
                                label={t("fields.documentNumber")}
                                value={profileForm.documentNumber}
                                onChange={(e) =>
                                    setProfileForm((prev) => ({
                                        ...prev,
                                        documentNumber: e.target.value,
                                    }))
                                }
                            />
                        </div>

                        <div className="mt-3">
                            <FieldInput
                                label={t("fields.address")}
                                value={profileForm.address}
                                onChange={(e) =>
                                    setProfileForm((prev) => ({ ...prev, address: e.target.value }))
                                }
                            />
                        </div>

                        <div className="mt-3">
                            <label className="mb-1 block text-sm font-medium">
                                {t("fields.notes")}
                            </label>
                            <textarea
                                className="w-full rounded-md border bg-background p-2 text-sm"
                                rows={3}
                                value={profileForm.notes}
                                onChange={(e) =>
                                    setProfileForm((prev) => ({ ...prev, notes: e.target.value }))
                                }
                            />
                        </div>

                        <div className="mt-3 flex flex-wrap gap-4 text-sm">
                            <label className="inline-flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={profileForm.isMedical}
                                    onChange={(e) =>
                                        setProfileForm((prev) => ({
                                            ...prev,
                                            isMedical: e.target.checked,
                                        }))
                                    }
                                />
                                {t("fields.isMedical")}
                            </label>
                            <label className="inline-flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={profileForm.isMj}
                                    onChange={(e) =>
                                        setProfileForm((prev) => ({
                                            ...prev,
                                            isMj: e.target.checked,
                                        }))
                                    }
                                />
                                {t("fields.isMj")}
                            </label>
                            <label className="inline-flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={profileForm.isRecreation}
                                    onChange={(e) =>
                                        setProfileForm((prev) => ({
                                            ...prev,
                                            isRecreation: e.target.checked,
                                        }))
                                    }
                                />
                                {t("fields.isRecreation")}
                            </label>
                        </div>

                        <div className="mt-4 flex gap-2">
                            <Button onClick={handleSave} disabled={updateMemberMutation.isPending}>
                                {updateMemberMutation.isPending ? t("saving") : t("saveProfile")}
                            </Button>
                        </div>

                        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
                    </div>
                </div>
            ) : null}
        </>
    );
}
