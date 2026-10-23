import { describe, expect, it } from "vitest";

import {
    BRAND_CODES,
    brandMarkSvg,
    BRANDS,
    DEFAULT_BRAND,
    getBrand,
    hasBrandModule,
    INSTALLATIONS,
} from "../index";

const HEX = /^#[0-9a-f]{6}$/;
const HOST = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;

describe("brands", () => {
    it.each(BRAND_CODES)("%s is consistent", (code) => {
        const brand = BRANDS[code];
        expect(brand.code).toBe(code);
        expect(brand.name.length).toBeGreaterThan(1);
        expect(brand.hiddenSkins).not.toContain(brand.defaultSkin);
        expect(new Set(brand.modules).size).toBe(brand.modules.length);
        for (const color of brand.palette) expect(color).toMatch(HEX);
        for (const host of Object.values(brand.domains)) expect(host).toMatch(HOST);
        expect(brand.domains.site).toBe(INSTALLATIONS[code].domain);
        expect(brand.mark.shapes.length).toBeGreaterThan(0);
    });

    it("every installation has a brand and the other way round", () => {
        expect(Object.keys(INSTALLATIONS).sort()).toEqual([...BRAND_CODES].sort());
    });

    it("no two installations share a domain or a place in the deploy order", () => {
        const domains = BRAND_CODES.map((code) => INSTALLATIONS[code].domain);
        expect(new Set(domains).size).toBe(domains.length);
        const order = BRAND_CODES.map((code) => INSTALLATIONS[code].deployOrder);
        expect(new Set(order).size).toBe(order.length);
    });

    it("exactly one installation runs the server-wide services", () => {
        const hosts = BRAND_CODES.filter((code) => INSTALLATIONS[code].serverServices);
        expect(hosts).toHaveLength(1);
        expect(INSTALLATIONS[hosts[0]!].released).toBe(true);
    });

    it("PafPaf is free and keeps the club door; studios pay and have no door", () => {
        expect(hasBrandModule(BRANDS.pafpaf, "billing")).toBe(false);
        expect(hasBrandModule(BRANDS.pafpaf, "presence")).toBe(true);
        expect(hasBrandModule(BRANDS.inkspace, "presence")).toBe(false);
        expect(hasBrandModule(BRANDS.inkspace, "billing")).toBe(true);
    });
});

describe("getBrand", () => {
    it("falls back to the default brand when the code is empty", () => {
        expect(getBrand(undefined).code).toBe(DEFAULT_BRAND);
        expect(getBrand("").code).toBe(DEFAULT_BRAND);
    });

    it("returns the brand by its code", () => {
        expect(getBrand("inkspace").name).toBe("Ink Space");
    });

    it("throws on an unknown code", () => {
        expect(() => getBrand("nagual")).toThrow(/Unknown brand "nagual"/);
    });
});

describe("brandMarkSvg", () => {
    it("paints every shape with the brand gradient", () => {
        const svg = brandMarkSvg(BRANDS.pafpaf);
        expect(svg).toContain('viewBox="1.75 1.8 20 20"');
        expect(svg).toContain('stop-color="#7b61ff"');
        expect(svg.match(/fill="url\(#g\)"/g)).toHaveLength(2);
    });
});
