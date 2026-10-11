import NextLink from "next/link";

import { SiteFrame } from "@site/theme";
import type { ReactNode } from "react";

import { getSiteDoc } from "@/modules/entities/site/api";
import { ROUTES } from "@/modules/shared/config/routes";

import "./legal.css";

/** The partner brief exists only in Russian for now; it is unlisted and kept out of search. */
export const PARTNER_BRIEF_LOCALE = "ru" as const;
export const PARTNER_BRIEF_TITLE = "Правовая основа PafPaf";
export const PARTNER_BRIEF_DESCRIPTION =
    "Как устроены продажа подписки на облачную CRM PafPaf, налоги для клиентов, работа с персональными данными и юридические документы продукта.";

type Status = "done" | "wip" | "plan";

const STATUS_LABEL: Record<Status, string> = { done: "есть", wip: "в работе", plan: "план" };

const Pill = ({ status, children }: { status: Status; children?: ReactNode }) => (
    <span className={`legal__pill legal__pill--${status}`}>{children ?? STATUS_LABEL[status]}</span>
);

const Table = ({ head, rows }: { head: string[]; rows: ReactNode[][] }) => (
    <div className="legal__table">
        <table>
            <thead>
                <tr>
                    {head.map((cell) => (
                        <th key={cell}>{cell}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                        {row.map((cell, index) => (
                            <td key={index}>{cell}</td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const legal = (doc: string) => ROUTES.legal(PARTNER_BRIEF_LOCALE, doc);

export const PartnerBrief = async () => {
    const site = await getSiteDoc(PARTNER_BRIEF_LOCALE);

    return (
        <SiteFrame locale={PARTNER_BRIEF_LOCALE} site={site} current="partners">
            <article className="legal wrap">
                <header className="legal__head">
                    <p className="eyebrow">Для партнёров · 11 октября 2026</p>
                    <h1 className="legal__title">{PARTNER_BRIEF_TITLE}</h1>
                    <p className="legal__meta">{PARTNER_BRIEF_DESCRIPTION}</p>
                    <p className="legal__note">
                        <Pill status="done" /> работает в продукте · <Pill status="wip" /> готовится
                        сейчас · <Pill status="plan" /> по графику ниже
                    </p>
                </header>

                <section className="legal__section">
                    <h2>Продукт и модель продаж</h2>
                    <dl className="legal__facts">
                        <div className="legal__fact">
                            <dt>Что продаём</dt>
                            <dd>Облачная CRM по подписке (B2B SaaS)</dd>
                        </div>
                        <div className="legal__fact">
                            <dt>Клиенты</dt>
                            <dd>Клубы и ассоциации, тату- и бьюти-студии, малый бизнес</dd>
                        </div>
                        <div className="legal__fact">
                            <dt>Тарифы</dt>
                            <dd>Помесячно и на год, в евро, с бесплатным периодом</dd>
                        </div>
                        <div className="legal__fact">
                            <dt>Рынок</dt>
                            <dd>Испания, затем страны ЕС</dd>
                        </div>
                    </dl>
                    <p>
                        Каждый клиент получает отдельное рабочее пространство. Данные клиентов
                        изолированы друг от друга, изоляцию проверяют автоматические тесты{" "}
                        <Pill status="done" />
                    </p>
                </section>

                <section className="legal__section">
                    <h2>Кто продаёт</h2>
                    <ul>
                        <li>
                            Продавец — испанский autónomo, индивидуальный предприниматель{" "}
                            <Pill status="plan">регистрация</Pill>
                        </li>
                        <li>
                            Регистрация в налоговой по форме 036: рубрика IAE 845 «Explotación
                            electrónica por cuenta de terceros», код деятельности CNAE-2025 58.29,
                            издание программного обеспечения.
                        </li>
                        <li>
                            Регистрация в реестре операторов внутри ЕС (ROI) для работы с клиентами
                            и поставщиками из других стран ЕС.
                        </li>
                        <li>
                            По мере роста бизнес переходит в Sociedad Limitada, компанию с
                            ограниченной ответственностью.
                        </li>
                    </ul>
                </section>

                <section className="legal__section">
                    <h2>Налоги для клиентов</h2>
                    <Table
                        head={["Клиент", "Налог в счёте"]}
                        rows={[
                            ["Испания", "IVA 21 %"],
                            [
                                "ЕС, бизнес с VAT-номером",
                                "Без IVA, обратное начисление (inversión del sujeto pasivo), номер проверяется в VIES",
                            ],
                            [
                                "ЕС, частное лицо",
                                "Испанский IVA до 10 000 € продаж в год по ЕС, выше — НДС страны клиента через OSS",
                            ],
                            ["Вне ЕС, бизнес", "Не облагается"],
                        ]}
                    />
                    <p>
                        Подписка на SaaS — предпринимательская деятельность, поэтому клиенту не
                        нужно удерживать IRPF со счетов PafPaf.
                    </p>
                </section>

                <section className="legal__section">
                    <h2>Счета</h2>
                    <ul>
                        <li>
                            Полные счета по испанскому регламенту RD 1619/2012: серия и сквозной
                            номер, NIF и адреса сторон, разбивка IVA, исправительные счета отдельной
                            серией <Pill status="wip" />
                        </li>
                        <li>
                            С 01.07.2027 счета выставляются через систему, совместимую с VERI*FACTU,
                            синхронизированную с платёжным биллингом <Pill status="plan" />
                        </li>
                        <li>
                            Электронные B2B-счета по закону Crea y Crece — к 06.10.2028{" "}
                            <Pill status="plan" />
                        </li>
                    </ul>
                </section>

                <section className="legal__section">
                    <h2>Оплата</h2>
                    <ul>
                        <li>
                            Оплата картой через Stripe Checkout, управление подпиской и отмена
                            онлайн в личном кабинете Stripe{" "}
                            <Pill status="done">есть в продукте</Pill>{" "}
                            <Pill status="wip">подключение аккаунта</Pill>
                        </li>
                        <li>
                            Бесплатный период; по его окончании клиент выбирает тариф и оплачивает
                            его онлайн <Pill status="done" />
                        </li>
                        <li>
                            Для годовых тарифов и по запросу клиента — оплата переводом по счёту{" "}
                            <Pill status="done" />
                        </li>
                    </ul>
                </section>

                <section className="legal__section">
                    <h2>Персональные данные</h2>
                    <h3>Роли</h3>
                    <ul>
                        <li>
                            Клиент — responsable за данные своих участников, клиентов и сотрудников,
                            которые ведёт в CRM.
                        </li>
                        <li>
                            PafPaf — encargado del tratamiento, обработчик этих данных по поручению
                            клиента.
                        </li>
                        <li>
                            Для данных об аккаунтах, оплате и посетителях сайта PafPaf сам выступает
                            responsable.
                        </li>
                    </ul>
                    <h3>Договор обработки (art. 28 RGPD)</h3>
                    <p>
                        Принимается при регистрации, принятая версия сохраняется. Включает
                        инструкции клиента, конфиденциальность, меры безопасности, порядок работы с
                        субобработчиками, помощь с правами субъектов данных, уведомление об
                        инцидентах в течение 48 часов, возврат и удаление данных по окончании
                        договора, аудит. Текст:{" "}
                        <NextLink href={legal("encargo")}>договор об обработке данных</NextLink>{" "}
                        <Pill status="wip" />
                    </p>
                    <h3>Субобработчики</h3>
                    <Table
                        head={["Задача", "Сервис и место", "Основание передачи"]}
                        rows={[
                            ["Серверы и база данных", "Hetzner, Германия", "Внутри ЕС"],
                            [
                                "Хранение файлов",
                                "Amazon S3, регион Стокгольм",
                                "Данные в ЕС; компания из США: DPF и SCC",
                            ],
                            ["Защита и доставка трафика", "Cloudflare", "DPF и SCC"],
                            [
                                "Письма",
                                <>
                                    Почтовый сервис в ЕС <Pill status="wip">выбирается</Pill>
                                </>,
                                "Внутри ЕС",
                            ],
                            ["Платежи", "Stripe, Ирландия", "Только данные оплаты подписки"],
                        ]}
                    />
                    <p>
                        Список публикуется на сайте:{" "}
                        <NextLink href={legal("subencargados")}>субобработчики</NextLink>. Об
                        изменениях клиенты узнают заранее и могут возразить.
                    </p>
                    <h3>Безопасность</h3>
                    <ul>
                        <li>
                            Изоляция данных клиентов на уровне каждого запроса{" "}
                            <Pill status="done" />
                        </li>
                        <li>
                            Шифрование соединений; хранение паролей только в виде хэшей{" "}
                            <Pill status="done" />
                        </li>
                        <li>
                            Ежедневные резервные копии в ЕС с проверкой восстановления{" "}
                            <Pill status="wip" />
                        </li>
                        <li>
                            Шифрование файлов, двухфакторный вход для персонала, журналы доступа{" "}
                            <Pill status="plan" />
                        </li>
                        <li>
                            Реестр обработок и процедура реагирования на инциденты{" "}
                            <Pill status="wip" />
                        </li>
                        <li>
                            Загрузка копий удостоверений личности станет необязательной, доступ к
                            ним ограничен <Pill status="plan" />
                        </li>
                    </ul>
                </section>

                <section className="legal__section">
                    <h2>Юридические документы продукта</h2>
                    <p>
                        Основная версия на испанском, переводы на английский и русский. При
                        расхождении действует испанский текст. Черновики на проверке у юриста{" "}
                        <Pill status="wip" />
                    </p>
                    <Table
                        head={["Документ", "О чём"]}
                        rows={[
                            [
                                <NextLink key="a" href={legal("aviso-legal")}>
                                    Aviso legal
                                </NextLink>,
                                "Кто продавец и как с ним связаться",
                            ],
                            [
                                <NextLink key="p" href={legal("privacidad")}>
                                    Política de privacidad
                                </NextLink>,
                                "Какие данные собираем, зачем, сколько храним, права пользователей",
                            ],
                            [
                                <NextLink key="c" href={legal("cookies")}>
                                    Política de cookies
                                </NextLink>,
                                "Какие cookies ставит сайт. Сейчас только технические",
                            ],
                            [
                                <NextLink key="t" href={legal("terminos")}>
                                    Términos y condiciones
                                </NextLink>,
                                "Условия подписки: тарифы, продление и отмена, ответственность, выгрузка данных",
                            ],
                            [
                                <NextLink key="e" href={legal("encargo")}>
                                    Contrato de encargo (DPA)
                                </NextLink>,
                                "Договор обработки персональных данных",
                            ],
                            [
                                <NextLink key="s" href={legal("subencargados")}>
                                    Subencargados
                                </NextLink>,
                                "Список субобработчиков",
                            ],
                        ]}
                    />
                </section>

                <section className="legal__section">
                    <h2>Требования ЕС</h2>
                    <ul>
                        <li>
                            Data Act. Клиент может забрать все свои данные и перейти к другому
                            поставщику: уведомление до 2 месяцев, данные доступны для выгрузки 30
                            дней, переход бесплатный <Pill status="plan">выгрузка портала</Pill>
                        </li>
                        <li>
                            DSA. Контактная точка для клиентов и органов, порядок жалоб на контент,
                            правила модерации в условиях <Pill status="wip" />
                        </li>
                        <li>
                            European Accessibility Act и NIS2 по типу услуги и размеру бизнеса не
                            применяются. Доступность интерфейса держим на уровне WCAG 2.2 AA как
                            хорошую практику.
                        </li>
                        <li>AI Act применяется только при появлении функций с ИИ.</li>
                    </ul>
                </section>

                <section className="legal__section">
                    <h2>График</h2>
                    <ol className="legal__timeline">
                        <li>
                            <time>2026 Q4</time>
                            <span>
                                Регистрация autónomo, юридические документы, договор обработки,
                                субобработчики, резервные копии, подключение платёжного аккаунта.
                            </span>
                        </li>
                        <li>
                            <time>до 2027</time>
                            <span>Выгрузка всего рабочего пространства по требованию клиента.</span>
                        </li>
                        <li>
                            <time dateTime="2027-01-12">12.01.2027</time>
                            <span>Бесплатный переход к другому поставщику по Data Act.</span>
                        </li>
                        <li>
                            <time dateTime="2027-07-01">01.07.2027</time>
                            <span>Счета через систему, совместимую с VERI*FACTU.</span>
                        </li>
                        <li>
                            <time>с ростом</time>
                            <span>
                                Переход в SL; при выходе на клиентов в ЕС — Stripe Tax и регистрация
                                в OSS.
                            </span>
                        </li>
                        <li>
                            <time dateTime="2028-10-06">06.10.2028</time>
                            <span>Электронные B2B-счета.</span>
                        </li>
                    </ol>
                    <p>
                        Документ описывает плановую схему на 11.10.2026 и не заменяет консультацию
                        юриста или налогового консультанта. Статусы у пунктов обновляются по мере
                        запуска.
                    </p>
                </section>
            </article>
        </SiteFrame>
    );
};
