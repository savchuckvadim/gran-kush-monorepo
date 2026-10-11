import type { Locale } from "@/modules/shared/config/locales";

/**
 * Inline text: `{done}`, `{wip}`, `{plan}` render a status pill with the default label,
 * `{wip:label}` the same pill with its own label; `[label](doc:encargo)` links a legal page.
 */
export type PartnerBlock =
    | { p: string }
    | { h3: string }
    | { list: string[] }
    | { facts: { term: string; value: string }[] }
    | { table: { head: string[]; rows: string[][] } }
    | { timeline: { time: string; dateTime?: string; text: string }[] };

export interface PartnerBriefContent {
    eyebrow: string;
    title: string;
    description: string;
    status: Record<"done" | "wip" | "plan", string>;
    legend: Record<"done" | "wip" | "plan", string>;
    sections: { heading: string; blocks: PartnerBlock[] }[];
}

const ru: PartnerBriefContent = {
    eyebrow: "Для партнёров · 11 октября 2026",
    title: "Правовая основа PafPaf",
    description:
        "Как устроены продажа подписки на облачную CRM PafPaf, налоги для клиентов, работа с персональными данными и юридические документы продукта.",
    status: { done: "есть", wip: "в работе", plan: "план" },
    legend: { done: "работает в продукте", wip: "готовится сейчас", plan: "по графику ниже" },
    sections: [
        {
            heading: "Продукт и модель продаж",
            blocks: [
                {
                    facts: [
                        { term: "Что продаём", value: "Облачная CRM по подписке (B2B SaaS)" },
                        {
                            term: "Клиенты",
                            value: "Клубы и ассоциации, тату- и бьюти-студии, малый бизнес",
                        },
                        {
                            term: "Тарифы",
                            value: "Помесячно и на год, в евро, с бесплатным периодом",
                        },
                        { term: "Рынок", value: "Испания, затем страны ЕС" },
                    ],
                },
                {
                    p: "Каждый клиент получает отдельное рабочее пространство. Данные клиентов изолированы друг от друга, изоляцию проверяют автоматические тесты {done}",
                },
            ],
        },
        {
            heading: "Кто продаёт",
            blocks: [
                {
                    list: [
                        "Продавец — испанский autónomo, индивидуальный предприниматель {plan:регистрация}",
                        "Регистрация в налоговой по форме 036: рубрика IAE 845 «Explotación electrónica por cuenta de terceros», код деятельности CNAE-2025 58.29, издание программного обеспечения.",
                        "Регистрация в реестре операторов внутри ЕС (ROI) для работы с клиентами и поставщиками из других стран ЕС.",
                        "По мере роста бизнес переходит в Sociedad Limitada, компанию с ограниченной ответственностью.",
                    ],
                },
            ],
        },
        {
            heading: "Налоги для клиентов",
            blocks: [
                {
                    table: {
                        head: ["Клиент", "Налог в счёте"],
                        rows: [
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
                        ],
                    },
                },
                {
                    p: "Подписка на SaaS — предпринимательская деятельность, поэтому клиенту не нужно удерживать IRPF со счетов PafPaf.",
                },
            ],
        },
        {
            heading: "Счета",
            blocks: [
                {
                    list: [
                        "Полные счета по испанскому регламенту RD 1619/2012: серия и сквозной номер, NIF и адреса сторон, разбивка IVA, исправительные счета отдельной серией {wip}",
                        "С 01.07.2027 счета выставляются через систему, совместимую с VERI*FACTU, синхронизированную с платёжным биллингом {plan}",
                        "Электронные B2B-счета по закону Crea y Crece — к 06.10.2028 {plan}",
                    ],
                },
            ],
        },
        {
            heading: "Оплата",
            blocks: [
                {
                    list: [
                        "Оплата картой через Stripe Checkout, управление подпиской и отмена онлайн в личном кабинете Stripe {done:есть в продукте} {wip:подключение аккаунта}",
                        "Бесплатный период; по его окончании клиент выбирает тариф и оплачивает его онлайн {done}",
                        "Для годовых тарифов и по запросу клиента — оплата переводом по счёту {done}",
                    ],
                },
            ],
        },
        {
            heading: "Персональные данные",
            blocks: [
                { h3: "Роли" },
                {
                    list: [
                        "Клиент — responsable за данные своих участников, клиентов и сотрудников, которые ведёт в CRM.",
                        "PafPaf — encargado del tratamiento, обработчик этих данных по поручению клиента.",
                        "Для данных об аккаунтах, оплате и посетителях сайта PafPaf сам выступает responsable.",
                    ],
                },
                { h3: "Договор обработки (art. 28 RGPD)" },
                {
                    p: "Принимается при регистрации, принятая версия сохраняется. Включает инструкции клиента, конфиденциальность, меры безопасности, порядок работы с субобработчиками, помощь с правами субъектов данных, уведомление об инцидентах в течение 48 часов, возврат и удаление данных по окончании договора, аудит. Текст: [договор об обработке данных](doc:encargo) {done}",
                },
                { h3: "Субобработчики" },
                {
                    table: {
                        head: ["Задача", "Сервис и место", "Основание передачи"],
                        rows: [
                            ["Серверы и база данных", "Hetzner, Германия", "Внутри ЕС"],
                            [
                                "Хранение файлов",
                                "Amazon S3, регион Стокгольм",
                                "Данные в ЕС; компания из США: DPF и SCC",
                            ],
                            ["Защита и доставка трафика", "Cloudflare", "DPF и SCC"],
                            ["Письма", "Почтовый сервис в ЕС {wip:выбирается}", "Внутри ЕС"],
                            ["Платежи", "Stripe, Ирландия", "Только данные оплаты подписки"],
                        ],
                    },
                },
                {
                    p: "Список публикуется на сайте: [субобработчики](doc:subencargados). Об изменениях клиенты узнают заранее и могут возразить.",
                },
                { h3: "Безопасность" },
                {
                    list: [
                        "Изоляция данных клиентов на уровне каждого запроса {done}",
                        "Шифрование соединений; хранение паролей только в виде хэшей {done}",
                        "Ежедневные резервные копии в ЕС с проверкой восстановления {wip}",
                        "Шифрование файлов, двухфакторный вход для персонала, журналы доступа {plan}",
                        "Реестр обработок и процедура реагирования на инциденты {wip}",
                        "Загрузка копий удостоверений личности станет необязательной, доступ к ним ограничен {plan}",
                    ],
                },
            ],
        },
        {
            heading: "Юридические документы продукта",
            blocks: [
                {
                    p: "Основная версия на испанском, переводы на английский и русский. При расхождении действует испанский текст. Черновики на проверке у юриста {wip}",
                },
                {
                    table: {
                        head: ["Документ", "О чём"],
                        rows: [
                            [
                                "[Aviso legal](doc:aviso-legal)",
                                "Кто продавец и как с ним связаться",
                            ],
                            [
                                "[Política de privacidad](doc:privacidad)",
                                "Какие данные собираем, зачем, сколько храним, права пользователей",
                            ],
                            [
                                "[Política de cookies](doc:cookies)",
                                "Какие cookies ставит сайт. Сейчас только технические",
                            ],
                            [
                                "[Términos y condiciones](doc:terminos)",
                                "Условия подписки: тарифы, продление и отмена, ответственность, выгрузка данных",
                            ],
                            [
                                "[Contrato de encargo (DPA)](doc:encargo)",
                                "Договор обработки персональных данных",
                            ],
                            ["[Subencargados](doc:subencargados)", "Список субобработчиков"],
                        ],
                    },
                },
            ],
        },
        {
            heading: "Требования ЕС",
            blocks: [
                {
                    list: [
                        "Data Act. Клиент может забрать все свои данные и перейти к другому поставщику: уведомление до 2 месяцев, данные доступны для выгрузки 30 дней, переход бесплатный {plan:выгрузка портала}",
                        "DSA. Контактная точка для клиентов и органов, порядок жалоб на контент, правила модерации в условиях {wip}",
                        "European Accessibility Act и NIS2 по типу услуги и размеру бизнеса не применяются. Доступность интерфейса держим на уровне WCAG 2.2 AA как хорошую практику.",
                        "AI Act применяется только при появлении функций с ИИ.",
                    ],
                },
            ],
        },
        {
            heading: "График",
            blocks: [
                {
                    timeline: [
                        {
                            time: "2026 Q4",
                            text: "Регистрация autónomo, юридические документы, договор обработки, субобработчики, резервные копии, подключение платёжного аккаунта.",
                        },
                        {
                            time: "до 2027",
                            text: "Выгрузка всего рабочего пространства по требованию клиента.",
                        },
                        {
                            time: "12.01.2027",
                            dateTime: "2027-01-12",
                            text: "Бесплатный переход к другому поставщику по Data Act.",
                        },
                        {
                            time: "01.07.2027",
                            dateTime: "2027-07-01",
                            text: "Счета через систему, совместимую с VERI*FACTU.",
                        },
                        {
                            time: "с ростом",
                            text: "Переход в SL; при выходе на клиентов в ЕС — Stripe Tax и регистрация в OSS.",
                        },
                        {
                            time: "06.10.2028",
                            dateTime: "2028-10-06",
                            text: "Электронные B2B-счета.",
                        },
                    ],
                },
                {
                    p: "Документ описывает плановую схему на 11.10.2026 и не заменяет консультацию юриста или налогового консультанта. Статусы у пунктов обновляются по мере запуска.",
                },
            ],
        },
    ],
};

const es: PartnerBriefContent = {
    eyebrow: "Para socios · 11 de octubre de 2026",
    title: "Marco legal de PafPaf",
    description:
        "Cómo se vende la suscripción a la CRM en la nube PafPaf, qué impuestos ven los clientes, cómo se tratan los datos personales y qué documentos legales tiene el producto.",
    status: { done: "hecho", wip: "en curso", plan: "previsto" },
    legend: {
        done: "funciona en el producto",
        wip: "en preparación",
        plan: "según el calendario de abajo",
    },
    sections: [
        {
            heading: "Producto y modelo de venta",
            blocks: [
                {
                    facts: [
                        {
                            term: "Qué vendemos",
                            value: "CRM en la nube por suscripción (SaaS B2B)",
                        },
                        {
                            term: "Clientes",
                            value: "Clubes y asociaciones, estudios de tatuaje y belleza, pequeñas empresas",
                        },
                        {
                            term: "Planes",
                            value: "Mensuales y anuales, en euros, con periodo gratuito",
                        },
                        { term: "Mercado", value: "España y después el resto de la UE" },
                    ],
                },
                {
                    p: "Cada cliente tiene su propio espacio de trabajo. Los datos de cada cliente están aislados de los demás y pruebas automáticas lo comprueban {done}",
                },
            ],
        },
        {
            heading: "Quién vende",
            blocks: [
                {
                    list: [
                        "El vendedor es un profesional autónomo en España {plan:alta}",
                        "Alta en Hacienda con el modelo 036: epígrafe IAE 845 «Explotación electrónica por cuenta de terceros», CNAE-2025 58.29, edición de programas informáticos.",
                        "Alta en el Registro de Operadores Intracomunitarios (ROI) para trabajar con clientes y proveedores de otros países de la UE.",
                        "Con el crecimiento, el negocio pasará a una sociedad limitada.",
                    ],
                },
            ],
        },
        {
            heading: "Impuestos para los clientes",
            blocks: [
                {
                    table: {
                        head: ["Cliente", "Impuesto en la factura"],
                        rows: [
                            ["España", "IVA 21 %"],
                            [
                                "UE, empresa con NIF-IVA",
                                "Sin IVA, inversión del sujeto pasivo; el número se comprueba en VIES",
                            ],
                            [
                                "UE, particular",
                                "IVA español hasta 10 000 € de ventas anuales en la UE; por encima, el IVA del país del cliente mediante OSS",
                            ],
                            ["Fuera de la UE, empresa", "No sujeto"],
                        ],
                    },
                },
                {
                    p: "La suscripción SaaS es una actividad empresarial, por eso el cliente no tiene que practicar retención de IRPF en las facturas de PafPaf.",
                },
            ],
        },
        {
            heading: "Facturas",
            blocks: [
                {
                    list: [
                        "Facturas completas según el RD 1619/2012: serie y numeración correlativa, NIF y direcciones de las partes, desglose del IVA, rectificativas en serie aparte {wip}",
                        "Desde el 01.07.2027 las facturas se emiten con un sistema compatible con VERI*FACTU, sincronizado con la facturación de pagos {plan}",
                        "Factura electrónica B2B según la Ley Crea y Crece, antes del 06.10.2028 {plan}",
                    ],
                },
            ],
        },
        {
            heading: "Pago",
            blocks: [
                {
                    list: [
                        "Pago con tarjeta mediante Stripe Checkout; gestión y cancelación de la suscripción en línea desde el portal de Stripe {done:en el producto} {wip:conexión de la cuenta}",
                        "Periodo gratuito; al terminar, el cliente elige plan y lo paga en línea {done}",
                        "Para planes anuales y a petición del cliente, pago por transferencia contra factura {done}",
                    ],
                },
            ],
        },
        {
            heading: "Datos personales",
            blocks: [
                { h3: "Roles" },
                {
                    list: [
                        "El cliente es responsable de los datos de sus socios, clientes y empleados que gestiona en la CRM.",
                        "PafPaf es encargado del tratamiento de esos datos por cuenta del cliente.",
                        "De los datos de cuentas, pagos y visitantes del sitio, PafPaf es responsable.",
                    ],
                },
                { h3: "Contrato de encargo (art. 28 RGPD)" },
                {
                    p: "Se acepta al registrarse y se guarda la versión aceptada. Incluye las instrucciones del cliente, la confidencialidad, las medidas de seguridad, el régimen de subencargados, la ayuda con los derechos de los interesados, el aviso de incidentes en 48 horas, la devolución y supresión de los datos al terminar y las auditorías. Texto: [contrato de encargo](doc:encargo) {done}",
                },
                { h3: "Subencargados" },
                {
                    table: {
                        head: ["Tarea", "Servicio y lugar", "Garantía de transferencia"],
                        rows: [
                            ["Servidores y base de datos", "Hetzner, Alemania", "Dentro de la UE"],
                            [
                                "Almacenamiento de archivos",
                                "Amazon S3, región Estocolmo",
                                "Datos en la UE; empresa de EE. UU.: DPF y cláusulas tipo",
                            ],
                            [
                                "Protección y entrega del tráfico",
                                "Cloudflare",
                                "DPF y cláusulas tipo",
                            ],
                            [
                                "Correo electrónico",
                                "Proveedor de correo en la UE {wip:en selección}",
                                "Dentro de la UE",
                            ],
                            ["Pagos", "Stripe, Irlanda", "Solo datos de pago de la suscripción"],
                        ],
                    },
                },
                {
                    p: "La lista se publica en el sitio: [subencargados](doc:subencargados). Los clientes conocen los cambios con antelación y pueden oponerse.",
                },
                { h3: "Seguridad" },
                {
                    list: [
                        "Aislamiento de los datos de cada cliente en cada petición {done}",
                        "Conexiones cifradas; contraseñas guardadas solo como hash {done}",
                        "Copias de seguridad diarias en la UE con prueba de restauración {wip}",
                        "Cifrado de archivos, doble factor para el personal, registros de acceso {plan}",
                        "Registro de actividades de tratamiento y procedimiento ante incidentes {wip}",
                        "Subir copias de documentos de identidad pasará a ser opcional, con acceso restringido {plan}",
                    ],
                },
            ],
        },
        {
            heading: "Documentos legales del producto",
            blocks: [
                {
                    p: "La versión principal es en español, con traducciones al inglés y al ruso; en caso de discrepancia prevalece el texto en español. Borradores en revisión por un abogado {wip}",
                },
                {
                    table: {
                        head: ["Documento", "De qué trata"],
                        rows: [
                            ["[Aviso legal](doc:aviso-legal)", "Quién vende y cómo contactar"],
                            [
                                "[Política de privacidad](doc:privacidad)",
                                "Qué datos tratamos, para qué, cuánto tiempo y los derechos de los usuarios",
                            ],
                            [
                                "[Política de cookies](doc:cookies)",
                                "Qué cookies usa el sitio. Ahora solo técnicas",
                            ],
                            [
                                "[Términos y condiciones](doc:terminos)",
                                "Condiciones de la suscripción: planes, renovación y cancelación, responsabilidad, exportación de datos",
                            ],
                            [
                                "[Contrato de encargo (DPA)](doc:encargo)",
                                "Contrato de encargo del tratamiento de datos personales",
                            ],
                            ["[Subencargados](doc:subencargados)", "Lista de subencargados"],
                        ],
                    },
                },
            ],
        },
        {
            heading: "Requisitos de la UE",
            blocks: [
                {
                    list: [
                        "Data Act. El cliente puede llevarse todos sus datos y cambiar de proveedor: preaviso de hasta 2 meses, datos disponibles para exportar durante 30 días, cambio gratuito {plan:exportación del espacio}",
                        "DSA. Punto de contacto para clientes y autoridades, procedimiento de quejas sobre contenidos y reglas de moderación en las condiciones {wip}",
                        "La European Accessibility Act y NIS2 no se aplican por el tipo de servicio y el tamaño del negocio. Mantenemos la accesibilidad de la interfaz en WCAG 2.2 AA como buena práctica.",
                        "El Reglamento de IA solo se aplicaría si se añaden funciones de IA.",
                    ],
                },
            ],
        },
        {
            heading: "Calendario",
            blocks: [
                {
                    timeline: [
                        {
                            time: "4T 2026",
                            text: "Alta como autónomo, documentos legales, contrato de encargo, subencargados, copias de seguridad y conexión de la cuenta de pagos.",
                        },
                        {
                            time: "antes de 2027",
                            text: "Exportación de todo el espacio de trabajo a petición del cliente.",
                        },
                        {
                            time: "12.01.2027",
                            dateTime: "2027-01-12",
                            text: "Cambio gratuito a otro proveedor según el Data Act.",
                        },
                        {
                            time: "01.07.2027",
                            dateTime: "2027-07-01",
                            text: "Facturas con un sistema compatible con VERI*FACTU.",
                        },
                        {
                            time: "al crecer",
                            text: "Paso a SL; con clientes en otros países de la UE, Stripe Tax y alta en OSS.",
                        },
                        {
                            time: "06.10.2028",
                            dateTime: "2028-10-06",
                            text: "Factura electrónica B2B.",
                        },
                    ],
                },
                {
                    p: "Este documento describe el esquema previsto a 11.10.2026 y no sustituye el asesoramiento de un abogado o asesor fiscal. Los estados se actualizan a medida que avanza el lanzamiento.",
                },
            ],
        },
    ],
};

const en: PartnerBriefContent = {
    eyebrow: "For partners · 11 October 2026",
    title: "PafPaf legal framework",
    description:
        "How the PafPaf cloud CRM subscription is sold, which taxes customers see, how personal data is handled and which legal documents the product has.",
    status: { done: "done", wip: "in progress", plan: "planned" },
    legend: { done: "works in the product", wip: "being prepared", plan: "per the schedule below" },
    sections: [
        {
            heading: "Product and sales model",
            blocks: [
                {
                    facts: [
                        { term: "What we sell", value: "Cloud CRM by subscription (B2B SaaS)" },
                        {
                            term: "Customers",
                            value: "Clubs and associations, tattoo and beauty studios, small businesses",
                        },
                        {
                            term: "Plans",
                            value: "Monthly and yearly, in euros, with a free period",
                        },
                        { term: "Market", value: "Spain, then the rest of the EU" },
                    ],
                },
                {
                    p: "Every customer gets its own workspace. Customers' data is isolated from each other, and automated tests check the isolation {done}",
                },
            ],
        },
        {
            heading: "Who sells",
            blocks: [
                {
                    list: [
                        "The seller is a self-employed professional (autónomo) in Spain {plan:registration}",
                        "Tax registration with form 036: IAE heading 845 “Explotación electrónica por cuenta de terceros”, CNAE-2025 58.29, software publishing.",
                        "Registration in the EU intra-community operators register (ROI) to work with customers and suppliers from other EU countries.",
                        "As the business grows it moves to a Sociedad Limitada, a limited liability company.",
                    ],
                },
            ],
        },
        {
            heading: "Taxes for customers",
            blocks: [
                {
                    table: {
                        head: ["Customer", "Tax on the invoice"],
                        rows: [
                            ["Spain", "VAT (IVA) 21%"],
                            [
                                "EU, business with a VAT number",
                                "No VAT, reverse charge; the number is checked in VIES",
                            ],
                            [
                                "EU, consumer",
                                "Spanish VAT up to €10,000 of EU sales a year; above that, the customer's country VAT via OSS",
                            ],
                            ["Outside the EU, business", "Out of scope"],
                        ],
                    },
                },
                {
                    p: "A SaaS subscription is a business activity, so customers do not withhold IRPF from PafPaf invoices.",
                },
            ],
        },
        {
            heading: "Invoices",
            blocks: [
                {
                    list: [
                        "Full invoices under Spanish RD 1619/2012: series and sequential number, tax IDs and addresses of both parties, VAT breakdown, corrective invoices in a separate series {wip}",
                        "From 01.07.2027 invoices are issued through a VERI*FACTU-compliant system synced with payment billing {plan}",
                        "B2B e-invoicing under the Crea y Crece law by 06.10.2028 {plan}",
                    ],
                },
            ],
        },
        {
            heading: "Payment",
            blocks: [
                {
                    list: [
                        "Card payment via Stripe Checkout; subscription management and online cancellation in the Stripe portal {done:in the product} {wip:account connection}",
                        "Free period; when it ends, the customer picks a plan and pays online {done}",
                        "For yearly plans and on request, payment by bank transfer against an invoice {done}",
                    ],
                },
            ],
        },
        {
            heading: "Personal data",
            blocks: [
                { h3: "Roles" },
                {
                    list: [
                        "The customer is the controller of the data of its members, clients and employees kept in the CRM.",
                        "PafPaf is the processor of that data on the customer's behalf.",
                        "For account, payment and website visitor data, PafPaf is the controller.",
                    ],
                },
                { h3: "Data processing agreement (Art. 28 GDPR)" },
                {
                    p: "Accepted at sign-up; the accepted version is stored. It covers the customer's instructions, confidentiality, security measures, sub-processors, help with data subject rights, incident notice within 48 hours, return and deletion of data at the end, and audits. Text: [data processing agreement](doc:encargo) {done}",
                },
                { h3: "Sub-processors" },
                {
                    table: {
                        head: ["Task", "Service and location", "Transfer safeguard"],
                        rows: [
                            ["Servers and database", "Hetzner, Germany", "Within the EU"],
                            [
                                "File storage",
                                "Amazon S3, Stockholm region",
                                "Data in the EU; US company: DPF and SCCs",
                            ],
                            ["Traffic protection and delivery", "Cloudflare", "DPF and SCCs"],
                            ["Email", "EU email provider {wip:being selected}", "Within the EU"],
                            ["Payments", "Stripe, Ireland", "Subscription payment data only"],
                        ],
                    },
                },
                {
                    p: "The list is published on the site: [sub-processors](doc:subencargados). Customers learn about changes in advance and can object.",
                },
                { h3: "Security" },
                {
                    list: [
                        "Customer data isolated on every request {done}",
                        "Encrypted connections; passwords stored only as hashes {done}",
                        "Daily backups in the EU with restore testing {wip}",
                        "File encryption, two-factor sign-in for staff, access logs {plan}",
                        "Record of processing activities and incident response procedure {wip}",
                        "Uploading identity document copies becomes optional, with restricted access {plan}",
                    ],
                },
            ],
        },
        {
            heading: "Product legal documents",
            blocks: [
                {
                    p: "The main version is in Spanish, with English and Russian translations; if they differ, the Spanish text prevails. Drafts under review by a lawyer {wip}",
                },
                {
                    table: {
                        head: ["Document", "What it covers"],
                        rows: [
                            [
                                "[Aviso legal](doc:aviso-legal)",
                                "Who the seller is and how to get in touch",
                            ],
                            [
                                "[Política de privacidad](doc:privacidad)",
                                "Which data we collect, why, for how long, and users' rights",
                            ],
                            [
                                "[Política de cookies](doc:cookies)",
                                "Which cookies the site sets. Technical ones only for now",
                            ],
                            [
                                "[Términos y condiciones](doc:terminos)",
                                "Subscription terms: plans, renewal and cancellation, liability, data export",
                            ],
                            [
                                "[Contrato de encargo (DPA)](doc:encargo)",
                                "Personal data processing agreement",
                            ],
                            ["[Subencargados](doc:subencargados)", "List of sub-processors"],
                        ],
                    },
                },
            ],
        },
        {
            heading: "EU requirements",
            blocks: [
                {
                    list: [
                        "Data Act. The customer can take all its data and switch provider: up to 2 months' notice, data available for export for 30 days, switching free of charge {plan:workspace export}",
                        "DSA. A point of contact for customers and authorities, a content complaint procedure and moderation rules in the terms {wip}",
                        "The European Accessibility Act and NIS2 do not apply given the type of service and the size of the business. The interface follows WCAG 2.2 AA as good practice.",
                        "The AI Act would only apply if AI features are added.",
                    ],
                },
            ],
        },
        {
            heading: "Schedule",
            blocks: [
                {
                    timeline: [
                        {
                            time: "Q4 2026",
                            text: "Autónomo registration, legal documents, data processing agreement, sub-processors, backups, payment account connection.",
                        },
                        {
                            time: "before 2027",
                            text: "Export of the whole workspace on the customer's request.",
                        },
                        {
                            time: "12.01.2027",
                            dateTime: "2027-01-12",
                            text: "Free switching to another provider under the Data Act.",
                        },
                        {
                            time: "01.07.2027",
                            dateTime: "2027-07-01",
                            text: "Invoices through a VERI*FACTU-compliant system.",
                        },
                        {
                            time: "with growth",
                            text: "Move to an SL; with customers elsewhere in the EU, Stripe Tax and OSS registration.",
                        },
                        { time: "06.10.2028", dateTime: "2028-10-06", text: "B2B e-invoicing." },
                    ],
                },
                {
                    p: "This document describes the planned setup as of 11.10.2026 and does not replace advice from a lawyer or tax adviser. Statuses are updated as the launch progresses.",
                },
            ],
        },
    ],
};

export const PARTNER_BRIEF: Record<Locale, PartnerBriefContent> = { ru, es, en };
