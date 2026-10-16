"use client";

import { useTranslations } from "next-intl";

import { Cake, Mail, Phone } from "lucide-react";

import { Badge, InitialsAvatar } from "@workspace/ui";
import { hueOf } from "@workspace/ui/lib/color";

import type { CrmMemberDetails } from "@/modules/entities/member";
import { personName } from "@/modules/shared/lib/person-name";
import { useAgeFormat } from "@/modules/shared/lib/use-span-format";

import { MemberHeroActions } from "./MemberHeroActions";
import { MemberHeroBadges } from "./MemberHeroBadges";

interface MemberHeroProps {
    member: CrmMemberDetails;
    inClubNow: boolean;
}

/** Who this is at a glance: portrait, name, number, status and how to reach them. */
export function MemberHero({ member, inClubNow }: MemberHeroProps) {
    const t = useTranslations("crm.members.card");
    const formatAge = useAgeFormat();
    const name = personName(member, member.email);
    const hue = hueOf(name);

    return (
        <section
            data-slot="member-hero"
            className="relative overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10"
        >
            {/* a wash of the member's own colour, the same as the portrait's */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                    background: `radial-gradient(120% 140% at 0% 0%, oklch(0.72 0.14 ${hue} / 0.22), transparent 55%)`,
                }}
            />
            <div className="relative flex flex-col gap-4 p-4 sm:flex-row sm:items-center md:p-6">
                <div className="relative w-fit shrink-0">
                    <InitialsAvatar
                        name={name}
                        colorful
                        className="size-16 text-xl ring-4 ring-background md:size-20 md:text-2xl"
                    />
                    {inClubNow && (
                        <span
                            className="absolute right-0.5 bottom-0.5 size-4 rounded-full bg-success ring-2 ring-background"
                            title={t("inClubNow")}
                        >
                            <span className="absolute inset-0 animate-ping rounded-full bg-success/60 motion-reduce:animate-none" />
                        </span>
                    )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <h1 className="min-w-0 truncate text-2xl font-semibold tracking-tight md:text-3xl">
                            {name}
                        </h1>
                        <Badge variant="outline" className="font-mono">
                            {member.membershipNumber
                                ? t("number", { number: member.membershipNumber })
                                : t("noNumber")}
                        </Badge>
                    </div>
                    <MemberHeroBadges member={member} inClubNow={inClubNow} />
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <a
                            href={`mailto:${member.email}`}
                            className="inline-flex min-w-0 items-center gap-1.5 hover:text-foreground"
                        >
                            <Mail className="size-3.5 shrink-0" aria-hidden="true" />
                            <span className="truncate">{member.email}</span>
                        </a>
                        {member.phone && (
                            <a
                                href={`tel:${member.phone}`}
                                className="inline-flex items-center gap-1.5 hover:text-foreground"
                            >
                                <Phone className="size-3.5" aria-hidden="true" />
                                {member.phone}
                            </a>
                        )}
                        {member.birthday && (
                            <span className="inline-flex items-center gap-1.5">
                                <Cake className="size-3.5" aria-hidden="true" />
                                {formatAge(member.birthday)}
                            </span>
                        )}
                    </div>
                </div>

                <MemberHeroActions member={member} inClubNow={inClubNow} />
            </div>
        </section>
    );
}
