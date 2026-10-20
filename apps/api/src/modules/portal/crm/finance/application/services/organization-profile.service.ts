import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import { employeeActor } from "@modules/events";

import {
    EMPTY_IDENTITY,
    fiscalYearStartFor,
    type OrganizationIdentity,
    type OrganizationProfile,
    type OrganizationTaxSettings,
    presetForPortalType,
} from "../../domain/organization/organization-profile";
import { validateOrganization } from "../../domain/organization/organization-validation";
import { OrganizationProfileRepository } from "../../domain/repositories/organization-profile-repository.interface";

export interface OrganizationProfileView {
    /** Профиль сохранён; `false` — показан пресет типа портала, реквизиты пустые */
    configured: boolean;
    profile: OrganizationTaxSettings & { identity: OrganizationIdentity; updatedAt: Date | null };
}

export type OrganizationProfileInput = Omit<OrganizationTaxSettings, "country" | "currency"> & {
    identity: OrganizationIdentity;
};

/**
 * Профиль организации (TASK-796): форма, налоговые режимы и реквизиты для учёта и документов.
 * До первого сохранения отдаётся пресет по типу портала (клуб — asociación, студии — autónomo).
 * Страна и валюта пока одна — ES / EUR; другие страны ЕС — пресетами, без смены модели.
 */
@Injectable()
export class OrganizationProfileService {
    constructor(private readonly repository: OrganizationProfileRepository) {}

    async get(portalId: string): Promise<OrganizationProfileView> {
        const saved = await this.repository.find(portalId);
        if (saved) return { configured: true, profile: saved };
        const type = await this.repository.portalType(portalId);
        if (!type) throw new NotFoundException("Portal not found");
        return {
            configured: false,
            profile: { ...presetForPortalType(type), identity: EMPTY_IDENTITY, updatedAt: null },
        };
    }

    async save(
        portalId: string,
        input: OrganizationProfileInput,
        employeeId: string
    ): Promise<OrganizationProfile> {
        const checked = validateOrganization(input, input.identity);
        if (!checked.ok) {
            throw new BadRequestException({
                message: `Invalid organization data: ${checked.field}`,
                code: checked.code,
                errors: [checked.field],
            });
        }
        const profile = {
            ...input,
            country: "ES",
            currency: "EUR",
            fiscalYearStartMonth: fiscalYearStartFor(input.legalForm, input.fiscalYearStartMonth),
            identity: checked.identity,
        };
        return this.repository.save(portalId, profile, employeeId, [
            {
                name: "finance.profile_updated",
                portalId,
                actor: employeeActor(employeeId),
                aggregateId: portalId,
                payload: {
                    legalForm: profile.legalForm,
                    vatRegime: profile.vatRegime,
                    incomeTaxRegime: profile.incomeTaxRegime,
                },
            },
        ]);
    }
}
