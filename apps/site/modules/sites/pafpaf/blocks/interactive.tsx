"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

const WAVE_FRONT =
    "M0 6 Q 12.5 0 25 6 T 50 6 T 75 6 T 100 6 T 125 6 T 150 6 T 175 6 T 200 6 T 225 6 T 250 6 T 275 6 T 300 6 T 325 6 T 350 6 T 375 6 T 400 6 V 260 H 0 Z";
const WAVE_BACK =
    "M-50 6 Q -37.5 0 -25 6 T 0 6 T 25 6 T 50 6 T 75 6 T 100 6 T 125 6 T 150 6 T 175 6 T 200 6 T 225 6 T 250 6 T 275 6 T 300 6 T 325 6 T 350 6 T 375 6 T 400 6 V 260 H -50 Z";

interface FlaskProps {
    used: number;
    limit: number;
    maxDraw: number;
}

// Monthly limit as a flask: today's pick-up raises the liquid, going over turns it red.
export const LimitFlask = ({ used, limit, maxDraw }: FlaskProps) => {
    const t = useTranslations();
    const locale = useLocale();
    const flaskRef = useRef<HTMLDivElement>(null);
    const [draw, setDraw] = useState(2);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const el = flaskRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry?.isIntersecting) {
                    setVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.35 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const total = used + draw;
    const over = total > limit;
    const level = visible ? Math.min(total / limit, 1) : 0;
    const y = (1 - level) * 192 - 6;
    const number = new Intl.NumberFormat(locale);

    return (
        <>
            <div className="ctrl glass reveal d1">
                <label htmlFor="limit-draw">
                    <span>{t("flask.today")}</span>
                    <output htmlFor="limit-draw">
                        {number.format(draw)} {t("units.g")}
                    </output>
                </label>
                <input
                    className="lrange"
                    type="range"
                    id="limit-draw"
                    min={0}
                    max={maxDraw}
                    step={1}
                    value={draw}
                    onChange={(event) => setDraw(Number(event.target.value))}
                    style={{ "--pct": `${(draw / maxDraw) * 100}%` } as CSSProperties}
                />
                <p className={`verdict${over ? " is-over" : ""}`} aria-live="polite">
                    {over
                        ? t("flask.over", { n: number.format(total - limit) })
                        : t("flask.ok", { n: number.format(limit - total) })}
                </p>
            </div>
            <div className="vis flask-slot">
                <div className={`gauge glass${over ? " is-over" : ""}`} ref={flaskRef}>
                    <svg viewBox="0 0 200 200" aria-hidden="true">
                        <defs>
                            <clipPath id="jar">
                                <circle cx="100" cy="100" r="96" />
                            </clipPath>
                        </defs>
                        <g clipPath="url(#jar)">
                            <g
                                className="water"
                                style={{ transform: `translateY(${y.toFixed(1)}px)` }}
                            >
                                <path className="w2" d={WAVE_BACK} />
                                <path className="w1" d={WAVE_FRONT} />
                            </g>
                        </g>
                    </svg>
                    <div className="gauge__label">
                        <b>{number.format(total)}</b>
                        <small>{t("flask.of", { limit: number.format(limit) })}</small>
                    </div>
                </div>
            </div>
        </>
    );
};

interface MetaballsProps {
    clubs: string[];
    merged: string;
}

const START = [
    { x: -130, y: -110, size: 160, color: "var(--a1)" },
    { x: 140, y: -60, size: 140, color: "var(--a2)" },
    { x: -10, y: 140, size: 130, color: "var(--a3)" },
];

// Three clubs as drops that merge into one account while the section scrolls to the centre.
export const Metaballs = ({ clubs, merged }: MetaballsProps) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const meta = ref.current;
        if (!meta) return;
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const parts = Array.from(meta.querySelectorAll<HTMLElement>("[data-x]"));
        let raf = 0;
        let running = false;
        const frame = (time: number) => {
            const vh = window.innerHeight;
            const r = meta.getBoundingClientRect();
            const p = Math.min(1, Math.max(0, (vh - (r.top + r.height / 2)) / (vh * 0.55)));
            const e = reduced ? 1 : p * p * (3 - 2 * p);
            const k = Math.min(1, meta.clientWidth / 520);
            meta.style.setProperty("--k", k.toFixed(3));
            parts.forEach((el, index) => {
                const wob = reduced ? 0 : (1 - e) * 10;
                const x =
                    (Number(el.dataset.x) * (1 - e) + Math.sin(time / 900 + index * 2) * wob) * k;
                const y =
                    (Number(el.dataset.y) * (1 - e) + Math.cos(time / 1100 + index) * wob) * k;
                el.style.setProperty("--x", `${x.toFixed(1)}px`);
                el.style.setProperty("--y", `${y.toFixed(1)}px`);
                if (!el.classList.contains("meta__ball"))
                    el.style.setProperty("--o", Math.max(0, 1 - e * 1.8).toFixed(2));
            });
            meta.style.setProperty("--m", Math.min(1, Math.max(0, (e - 0.72) / 0.28)).toFixed(2));
            raf = running && !reduced ? requestAnimationFrame(frame) : 0;
        };
        const observer = new IntersectionObserver(([entry]) => {
            running = Boolean(entry?.isIntersecting);
            if (running && !raf) raf = requestAnimationFrame(frame);
        });
        observer.observe(meta);
        frame(0);
        return () => {
            running = false;
            cancelAnimationFrame(raf);
            observer.disconnect();
        };
    }, []);

    return (
        <div className="meta" ref={ref}>
            <div className="meta__goo" aria-hidden="true">
                {START.map((s, index) => (
                    <span
                        key={index}
                        className="meta__ball"
                        data-x={s.x}
                        data-y={s.y}
                        style={{ "--c": s.color, "--s": `${s.size}px` } as CSSProperties}
                    />
                ))}
            </div>
            {clubs.slice(0, 3).map((name, index) => (
                <span
                    key={name}
                    className="meta__label glass"
                    data-x={START[index]?.x}
                    data-y={START[index]?.y}
                >
                    {name}
                </span>
            ))}
            <span className="meta__one" aria-hidden="true">
                {merged}
            </span>
        </div>
    );
};

type Role = "disp" | "manager" | "admin";

const RANK: Record<Role, number> = { disp: 0, manager: 1, admin: 2 };

// A member record behind frosted glass that melts according to the staff role.
export const RolesRecord = () => {
    const t = useTranslations();
    const [role, setRole] = useState<Role>("disp");
    const rows: { label: string; value: string; min: Role }[] = [
        { label: t("record.number"), value: "0147", min: "disp" },
        { label: t("record.limit"), value: `41 / 60 ${t("units.g")}`, min: "disp" },
        { label: t("record.fee"), value: t("record.feeValue"), min: "manager" },
        { label: t("record.sponsor"), value: "Nº 0098", min: "manager" },
        { label: t("record.phone"), value: "+34 612 48 90 17", min: "manager" },
        { label: t("record.id"), value: "Y1234567X", min: "admin" },
        { label: t("record.files"), value: t("record.filesValue"), min: "admin" },
    ];

    return (
        <>
            <div className="roles glass" role="group" aria-label={t("a11y.roles")}>
                {(["disp", "manager", "admin"] as const).map((r) => (
                    <button
                        key={r}
                        type="button"
                        aria-pressed={role === r}
                        onClick={() => setRole(r)}
                    >
                        {t(`roles.${r}`)}
                    </button>
                ))}
            </div>
            <div className="vis roles-slot">
                <div className="record glass">
                    <div className="record__top">
                        <span className="av">LM</span>
                        <div>
                            <b>Lucía Martín</b>
                            <small className="small">{t("record.since")}</small>
                        </div>
                    </div>
                    <dl>
                        {rows.map((row) => {
                            const hidden = RANK[role] < RANK[row.min];
                            return (
                                <div key={row.label}>
                                    <dt>{row.label}</dt>
                                    <dd
                                        className={hidden ? "is-frost" : undefined}
                                        aria-hidden={hidden || undefined}
                                    >
                                        {row.value}
                                    </dd>
                                </div>
                            );
                        })}
                    </dl>
                </div>
            </div>
        </>
    );
};
