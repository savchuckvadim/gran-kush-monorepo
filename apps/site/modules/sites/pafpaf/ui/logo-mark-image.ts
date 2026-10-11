// LogoMark from svg-defs.tsx with its gradient inlined, for images drawn by ImageResponse
// (apple-icon, opengraph-image). app/icon.svg is the same mark as a static file.
const LOGO_MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="1.75 1.8 20 20"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7b61ff"/><stop offset=".55" stop-color="#ff5fa2"/><stop offset="1" stop-color="#ffb340"/></linearGradient></defs><circle cx="9" cy="13.5" r="6.4" fill="url(#g)"/><circle cx="16.6" cy="8" r="4.3" fill="url(#g)" opacity=".82"/></svg>`;

export const LOGO_MARK_SRC = `data:image/svg+xml,${encodeURIComponent(LOGO_MARK_SVG)}`;
