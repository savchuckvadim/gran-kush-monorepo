import { getTranslations } from "next-intl/server";

import type { FeatureGridBlock, QrDoorBlock } from "@/payload-types";

import { CheckIcon, FeatureIconSvg } from "../ui/icons";
import { Qr } from "../ui/qr";
import { SmokeText } from "../ui/smoke-text";

import { GooGrid, PhoneCycle } from "./door-and-grid-client";

export const QrDoor = async ({ block }: { block: QrDoorBlock }) => {
    const t = await getTranslations("phone");
    return (
        <section className="sec" id={block.anchor || undefined}>
            <div className="wrap split">
                <div>
                    {block.eyebrow && <span className="eyebrow">{block.eyebrow}</span>}
                    <SmokeText className="h2" text={block.title} />
                    {block.text && <p className="lede reveal">{block.text}</p>}
                </div>
                <PhoneCycle>
                    <div className="gphone glass">
                        <span className="gphone__island" />
                        <div className="gphone__screen">
                            <div className="scr scr--0">
                                <small>{t("member")}</small>
                                <Qr seed={147} />
                                <b>Lucía Martín</b>
                            </div>
                            <div className="scr scr--1">
                                <span className="av">LM</span>
                                <b>Lucía Martín</b>
                                <div className="chips">
                                    <span className="g">{t("fee")}</span>
                                    <span>{t("sponsor")}</span>
                                    <span>{t("signed")}</span>
                                </div>
                            </div>
                            <div className="scr scr--2">
                                <div className="okdrop">
                                    <CheckIcon />
                                </div>
                                <b>{t("ok")}</b>
                                <small>18:42</small>
                            </div>
                        </div>
                    </div>
                </PhoneCycle>
            </div>
        </section>
    );
};

const DELAYS = ["", " d1", " d2"];

export const FeatureGrid = ({ block }: { block: FeatureGridBlock }) => (
    <section className="sec" id={block.anchor || undefined}>
        <div className="wrap center">
            {block.eyebrow && <span className="eyebrow">{block.eyebrow}</span>}
            <SmokeText className="h2" text={block.title} />
        </div>
        <div className="wrap">
            <GooGrid>
                {(block.items ?? []).map((item, index) => (
                    <article
                        key={item.id ?? index}
                        className={`gcard glass reveal${DELAYS[index % 3]}`}
                    >
                        <span className="gcard__ico">
                            <FeatureIconSvg name={item.icon} />
                        </span>
                        <div>
                            <h3>{item.title}</h3>
                            {item.text && <p>{item.text}</p>}
                        </div>
                    </article>
                ))}
            </GooGrid>
        </div>
    </section>
);
