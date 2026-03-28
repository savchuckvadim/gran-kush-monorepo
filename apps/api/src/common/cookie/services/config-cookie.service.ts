import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { CookieOptions } from "express";

import { AUTH_GLOBAL_SCOPE } from "@common/auth";

const MEMBER_AUTH_COOKIE_DOMAIN_ENV_KEY = "MEMBER_AUTH_COOKIE_DOMAIN";
const CRM_AUTH_COOKIE_DOMAIN_ENV_KEY = "CRM_AUTH_COOKIE_DOMAIN";
const MEMBER_ACCESS_COOKIE_NAME_ENV_KEY = "MEMBER_ACCESS_COOKIE_NAME";
const MEMBER_REFRESH_COOKIE_NAME_ENV_KEY = "MEMBER_REFRESH_COOKIE_NAME";
const CRM_ACCESS_COOKIE_NAME_ENV_KEY = "CRM_ACCESS_COOKIE_NAME";
const CRM_REFRESH_COOKIE_NAME_ENV_KEY = "CRM_REFRESH_COOKIE_NAME";
const JWT_ACCESS_TOKEN_EXPIRES_IN_ENV_KEY = "JWT_ACCESS_TOKEN_EXPIRES_IN";
const JWT_REFRESH_TOKEN_EXPIRES_IN_ENV_KEY = "JWT_REFRESH_TOKEN_EXPIRES_IN";
const AUTH_COOKIE_SECURE_ENV_KEY = "AUTH_COOKIE_SECURE";
const NODE_ENV_ENV_KEY = "NODE_ENV";

const DEFAULT_MEMBER_ACCESS_COOKIE_NAME = "member_access_token";
const DEFAULT_MEMBER_REFRESH_COOKIE_NAME = "member_refresh_token";
const DEFAULT_CRM_ACCESS_COOKIE_NAME = "crm_access_token";
const DEFAULT_CRM_REFRESH_COOKIE_NAME = "crm_refresh_token";
const DEFAULT_ACCESS_TOKEN_EXPIRES_IN = "15m";
const DEFAULT_REFRESH_TOKEN_EXPIRES_IN = "7d";
const DEFAULT_DURATION_FALLBACK_MS = 7 * 24 * 60 * 60 * 1000;

const SAME_SITE_LAX: CookieOptions["sameSite"] = "lax";
const COOKIE_PATH_ROOT = "/";
const BOOLEAN_TRUE_STRING = "true";
const BOOLEAN_FALSE_STRING = "false";
const NODE_ENV_PRODUCTION = "production";

const DURATION_REGEX = /^(\d+)([smhd])$/;
const DURATION_UNIT_SECONDS = "s";
const DURATION_UNIT_MINUTES = "m";
const DURATION_UNIT_HOURS = "h";

const SECOND_IN_MS = 1000;
const MINUTE_IN_MS = 60_000;
const HOUR_IN_MS = 3_600_000;
const DAY_IN_MS = 86_400_000;

@Injectable()
export class ConfigCookieService {
    private readonly profileDomain: string;
    private readonly crmDomain: string;

    constructor(private readonly configService: ConfigService) {
        this.profileDomain = this.configService.getOrThrow<string>(
            MEMBER_AUTH_COOKIE_DOMAIN_ENV_KEY
        );
        this.crmDomain = this.configService.getOrThrow<string>(CRM_AUTH_COOKIE_DOMAIN_ENV_KEY);
        console.log("this.profileDomain", this.profileDomain);
        console.log("this.crmDomain", this.crmDomain);
    }

    public getCookieConfig(scope: AUTH_GLOBAL_SCOPE): {
        access: CookieOptions;
        refresh: CookieOptions;
    } {
        const secure = this.isSecureCookies();
        const domain = this.getDomain(scope);
        console.log("domain  = this.getDomain", domain);
        const accessConfig: CookieOptions = {
            httpOnly: true,
            secure,
            sameSite: SAME_SITE_LAX,
            path: COOKIE_PATH_ROOT,
            domain: domain || undefined,
            maxAge: this.accessTokenMaxAgeMs(),
        };

        const refreshConfig: CookieOptions = {
            httpOnly: true,
            secure,
            sameSite: SAME_SITE_LAX,
            path: COOKIE_PATH_ROOT,
            domain: domain || undefined,
            maxAge: this.refreshTokenMaxAgeMs(),
        };

        return {
            access: accessConfig,
            refresh: refreshConfig,
        };
    }

    public getCookieNames(scope: AUTH_GLOBAL_SCOPE): { access: string; refresh: string } {
        if (scope === AUTH_GLOBAL_SCOPE.SITE) {
            return {
                access:
                    this.configService.get<string>(MEMBER_ACCESS_COOKIE_NAME_ENV_KEY) ||
                    DEFAULT_MEMBER_ACCESS_COOKIE_NAME,
                refresh:
                    this.configService.get<string>(MEMBER_REFRESH_COOKIE_NAME_ENV_KEY) ||
                    DEFAULT_MEMBER_REFRESH_COOKIE_NAME,
            };
        }

        return {
            access:
                this.configService.get<string>(CRM_ACCESS_COOKIE_NAME_ENV_KEY) ||
                DEFAULT_CRM_ACCESS_COOKIE_NAME,
            refresh:
                this.configService.get<string>(CRM_REFRESH_COOKIE_NAME_ENV_KEY) ||
                DEFAULT_CRM_REFRESH_COOKIE_NAME,
        };
    }

    public getDomain(scope: AUTH_GLOBAL_SCOPE): string {
        console.log("scope", scope);
        return scope === AUTH_GLOBAL_SCOPE.SITE ? this.profileDomain : this.crmDomain;
    }

    private accessTokenMaxAgeMs(): number {
        return this.parseDurationToMs(
            this.configService.get<string>(JWT_ACCESS_TOKEN_EXPIRES_IN_ENV_KEY) ||
                DEFAULT_ACCESS_TOKEN_EXPIRES_IN
        );
    }

    private refreshTokenMaxAgeMs(): number {
        return this.parseDurationToMs(
            this.configService.get<string>(JWT_REFRESH_TOKEN_EXPIRES_IN_ENV_KEY) ||
                DEFAULT_REFRESH_TOKEN_EXPIRES_IN
        );
    }
    private isSecureCookies(): boolean {
        const explicit = this.configService.get<string>(AUTH_COOKIE_SECURE_ENV_KEY);
        if (explicit === BOOLEAN_TRUE_STRING) return true;
        if (explicit === BOOLEAN_FALSE_STRING) return false;
        return this.configService.get<string>(NODE_ENV_ENV_KEY) === NODE_ENV_PRODUCTION;
    }

    private parseDurationToMs(value: string): number {
        const parsed = DURATION_REGEX.exec(value.trim());
        if (!parsed) {
            return DEFAULT_DURATION_FALLBACK_MS;
        }

        const amount = Number(parsed[1]);
        const unit = parsed[2];
        const multiplier =
            unit === DURATION_UNIT_SECONDS
                ? SECOND_IN_MS
                : unit === DURATION_UNIT_MINUTES
                  ? MINUTE_IN_MS
                  : unit === DURATION_UNIT_HOURS
                    ? HOUR_IN_MS
                    : DAY_IN_MS;
        return amount * multiplier;
    }
}
