import type { BrandConfig, BrandMarkShape } from "./types";

const shapeSvg = (shape: BrandMarkShape): string => {
    const opacity = shape.opacity === undefined ? "" : ` opacity="${shape.opacity}"`;
    return shape.kind === "circle"
        ? `<circle cx="${shape.cx}" cy="${shape.cy}" r="${shape.r}" fill="url(#g)"${opacity}/>`
        : `<path d="${shape.d}" fill="url(#g)"${opacity}/>`;
};

/** The mark as a standalone SVG cropped for an icon: favicon, apple icon, email. */
export const brandMarkSvg = (brand: BrandConfig): string => {
    const [from, via, to] = brand.palette;
    return (
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${brand.mark.iconViewBox}">` +
        `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
        `<stop offset="0" stop-color="${from}"/><stop offset=".55" stop-color="${via}"/>` +
        `<stop offset="1" stop-color="${to}"/></linearGradient></defs>` +
        brand.mark.shapes.map(shapeSvg).join("") +
        `</svg>`
    );
};

export const brandMarkDataUrl = (brand: BrandConfig): string =>
    `data:image/svg+xml,${encodeURIComponent(brandMarkSvg(brand))}`;
