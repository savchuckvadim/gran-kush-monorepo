// Filters for goo (liquid drops) and refraction (liquid glass), referenced from CSS.
export const SvgDefs = () => (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
            <filter id="goo">
                <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b" />
                <feColorMatrix
                    in="b"
                    mode="matrix"
                    values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9"
                />
            </filter>
            <filter id="goo-big" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="20" result="b" />
                <feColorMatrix
                    in="b"
                    mode="matrix"
                    values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 34 -14"
                />
            </filter>
            <filter id="liquid" x="0" y="0" width="100%" height="100%">
                <feTurbulence
                    type="fractalNoise"
                    baseFrequency="0.006 0.018"
                    numOctaves={2}
                    seed={11}
                    result="n"
                />
                <feDisplacementMap
                    in="SourceGraphic"
                    in2="n"
                    scale={42}
                    xChannelSelector="R"
                    yChannelSelector="G"
                />
            </filter>
            <filter
                id="prism"
                x="0"
                y="0"
                width="100%"
                height="100%"
                colorInterpolationFilters="sRGB"
            >
                <feTurbulence
                    type="fractalNoise"
                    baseFrequency="0.012"
                    numOctaves={1}
                    seed={4}
                    result="n"
                />
                <feDisplacementMap
                    in="SourceGraphic"
                    in2="n"
                    scale={26}
                    xChannelSelector="R"
                    yChannelSelector="G"
                    result="d"
                />
                <feColorMatrix
                    in="d"
                    type="matrix"
                    values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
                    result="r"
                />
                <feOffset in="r" dx={-6} result="r2" />
                <feColorMatrix
                    in="d"
                    type="matrix"
                    values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
                    result="g"
                />
                <feColorMatrix
                    in="d"
                    type="matrix"
                    values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
                    result="bl"
                />
                <feOffset in="bl" dx={6} result="b2" />
                <feBlend in="r2" in2="g" mode="screen" result="rg" />
                <feBlend in="rg" in2="b2" mode="screen" />
            </filter>
            <linearGradient id="auroraV" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#8f7bff" />
                <stop offset=".55" stopColor="#ff6fae" />
                <stop offset="1" stopColor="#ffbf5a" />
            </linearGradient>
            <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#7b61ff" />
                <stop offset=".55" stopColor="#ff5fa2" />
                <stop offset="1" stopColor="#ffb340" />
            </linearGradient>
        </defs>
    </svg>
);

export const LogoMark = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="9" cy="13.5" r="6.4" fill="url(#logoGrad)" />
        <circle cx="16.6" cy="8" r="4.3" fill="url(#logoGrad)" opacity=".82" />
    </svg>
);
