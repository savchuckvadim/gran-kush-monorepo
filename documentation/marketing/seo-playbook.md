# SEO-плейбук: три сайта (клубы, тату, бьюти)

Дата: 2026-10-19. Для кого: Вадим — один человек, разработчик, SEO учит на своём продукте. Задачи по коду —
в [verticals-and-seo](../tasks/verticals-and-seo.md) (TASK-75x…77x). Здесь — что делать руками, в каком
порядке, чем мерить и где читать первоисточники.

Три сайта на одном движке `apps/site`: клубы (`paf-paf.app`, есть), тату-студии и бьюти (домены и имена —
TASK-770). Рынок — Испания, язык выдачи — испанский; `ru`/`en` версии нужны для hreflang и доверия, трафик
с них не ждём.

---

## 0. Что важно понимать до старта

- **Новый домен даёт первые позиции через 3–6 месяцев.** Раньше судить нельзя; Google сам пишет «подождите
  несколько недель» после каждого изменения
  ([SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)).
- **Ниша клубов маленькая.** Запросов вида «software asociación cannábica» — сотни в месяц на всю Испанию
  (проверить в Keyword Planner, §2). Это полигон для обучения и источник бесплатных клиентов, не деньги.
- **Тату и бьюти больше, но там Booksy, Fresha, Treatwell, TattooNet, Zeeclip.** По общим запросам
  («software peluquería») их не обогнать. Идём в длинный хвост, «alternativa a X», ниша альтернативщиков и
  Испания-специфику (consentimiento informado, Verifactu).
- **Платная реклама каннабиса в Google запрещена** вне канадского пилота
  ([политика Google Ads, 2026-03](https://support.google.com/adspolicy/answer/16989811)). Для клубного сайта —
  только органика, тексты уже нейтральные (без граммов и выдачи). Для тату и бьюти Google Ads доступен — можно
  потом проверять конверсию посадочных за 50–100 € до того, как ждать органику.
- **60–70 % выдачи — без клика** (AI Overviews, блоки ответов), оценки разнятся по источникам:
  [Linkflow](https://linkflow.ai/blog/zero-click-searches/), [Dupple](https://dupple.com/learn/zero-click-search).
  Цель — не только клик, а быть источником, который цитируют. Как Google рекомендует работать с AI-функциями:
  [AI features and your website](https://developers.google.com/search/docs/appearance/ai-features).
- **Verifactu — осторожно с обещаниями.** По закону (RDL 15/2025) обязателен с 01.01.2027 для SL и
  01.07.2027 для автономос; 05.10.2026 Hacienda анонсировала перенос на октябрь 2028, в BOE этого ещё нет
  ([Infoautónomos](https://www.infoautonomos.com/blog/hacienda-retrasa-entrada-vigor-verifactu/),
  [SAPI](https://sapi.es/blog/verifactu-se-aplaza-a-octubre-de-2028-nuevas-fechas-que-dice-el-boe-y-que-hacer-ahora)).
  Электронная B2B-фактура — с 06.10.2027 (>8 M€) и 06.10.2028 (остальные), Orden HAC/1028/2026. На сайте
  писать «готовимся к Verifactu», не «Verifactu-ready», пока модуля нет. Проверять:
  [AEAT — Verifactu](https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu.html).

---

## 1. Техническая база (один раз на сайт)

Чек-лист на запуск домена. Код для пунктов 1–4 — TASK-760…769; здесь — что проверить руками.

1. **Индексируемость.** `robots.txt` открыт, нет `noindex` на коммерческих страницах, `sitemap.xml` отдаёт все
   страницы × 3 локали с hreflang. Проверка: `site:домен` в Google и отчёт «Страницы» в Search Console.
   Источники: [Search Essentials](https://developers.google.com/search/docs/essentials),
   [Sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview),
   [Localized versions / hreflang](https://developers.google.com/search/docs/specialty/international/localized-versions).
2. **Search Console.** Добавить домен как Domain property (DNS TXT через Cloudflare), отправить sitemap,
   включить email-оповещения. [Search Console](https://search.google.com/search-console/about),
   [верификация](https://support.google.com/webmasters/answer/9008080).
3. **Bing Webmaster Tools.** Импорт из Search Console в один клик; Copilot и ChatGPT-поиск опираются на индекс
   Bing. [Bing Webmaster Tools](https://www.bing.com/webmasters). IndexNow — опционально
   ([indexnow.org](https://www.indexnow.org/)).
4. **Скорость и Core Web Vitals.** [PageSpeed Insights](https://pagespeed.web.dev/) по главной и странице цен,
   мобильный профиль; цель — зелёные LCP/INP/CLS. Видео дыма 7 MB и `force-dynamic` — первые кандидаты
   (TASK-769). [Core Web Vitals](https://developers.google.com/search/docs/appearance/core-web-vitals).
5. **Структурированные данные.** Уже есть Organization / WebSite / SoftwareApplication / FAQPage. Проверить
   [Rich Results Test](https://search.google.com/test/rich-results). Для статей — Article
   ([doc](https://developers.google.com/search/docs/appearance/structured-data/article)).
   [SoftwareApplication](https://developers.google.com/search/docs/appearance/structured-data/software-app).
6. **Аналитика без баннера.** Self-host Plausible CE или Umami на Dokploy — без cookies, без согласия; обновить
   юр. тексты, где сейчас «no analytics». [Plausible CE](https://github.com/plausible/community-edition),
   [Umami](https://umami.is/). GA4 — только если понадобится связка с Google Ads.
7. **Один раз на старте.** Снять скриншот Search Console (0 кликов) — это базовая точка для отчёта «что дало SEO».

---

## 2. Семантика: какие запросы брать

Инструменты (бесплатно):

- [Google Keyword Planner](https://ads.google.com/intl/es_es/home/tools/keyword-planner/) — нужен аккаунт
  Google Ads без запущенных кампаний; показывает диапазоны объёма по Испании. Основной источник цифр.
- [Ahrefs Webmaster Tools](https://ahrefs.com/webmaster-tools) — бесплатно для своих подтверждённых доменов:
  бэклинки, аудит, часть ключей.
- [Google Trends, Испания](https://trends.google.com/trends/?geo=ES) — сезонность (бьюти: до лета и
  декабря; тату: весна–лето).
- Подсказки Google («Búsquedas relacionadas», «Otras preguntas») — вручную, в режиме инкогнито с `gl=es`.
- Search Console через 4–8 недель покажет реальные запросы, по которым уже есть показы — это главный
  источник тем после запуска.

Стартовые кластеры (гипотезы, объёмы проверить в Keyword Planner и записать в таблицу §4):

**Клубы (`paf-paf.app`)**

| Интент | Запросы |
|---|---|
| Коммерческий | software asociación cannábica, programa gestión club cannábico, app socios club cannabis, gestión de socios asociación, software club social cannabis |
| Сравнение | alternativa a SmokApp / THC Gestión / GreenClub, mejor software para asociaciones cannábicas |
| Информационный (трафик) | cómo abrir una asociación cannábica, estatutos asociación cannábica, requisitos socios club cannábico, RGPD asociación cannábica, carnet de socio club |
| Боль (из Notion-ресерча) | cambiar de Excel a CRM club, control de aforo club, pérdidas de stock asociación |

Конкуренты и их SEO-кластеры уже собраны в Notion «CSC CRM Competitor Research» (13 игроков, обзор
2026-08-01): [GreenClub](https://greenclub.es/es), [WeedCore](https://weedcore.es/),
[Admin420](https://admin420.com/), [THC Gestión](https://thcgestion.com/), [SmokApp](https://smokapp.com/),
[Gestión Verde](https://www.softwarecannabis.es/en/).

**Тату**

| Интент | Запросы |
|---|---|
| Коммерческий | software estudio de tatuajes, agenda para tatuadores, programa gestión estudio tatuaje, app para tatuadores, reservas online tatuaje, gestión de cabinas tatuaje |
| Сравнение | alternativa a TattooNet, Zeeclip vs TattooNet, software tatuaje gratis |
| Информационный | consentimiento informado tatuaje plantilla (сильный — у нас есть подпись и документы), cómo abrir un estudio de tatuajes, registro sanitario estudio tatuaje, normativa tatuajes [comunidad], señal/depósito tatuaje no-show |

Конкуренты: [TattooNet](https://www.tattoonet.es/) (15 €/мес), [Zeeclip](https://zeeclip.com/),
[Anolla](https://anolla.com/en/tattoo-software), [EasyWeek](https://easyweek.es/business/solutions/tattoo-shop),
[Cool Tattoo Consent](https://www.tatuadores.com/cooltattooconsent-nuevas-funcionalidades-gestion-estudio/).
Каталоги для листинга: [Capterra ES](https://www.capterra.es/directory/31616/tattoo-studio/software),
[GetApp ES](https://www.getapp.es/directory/1951/tattoo-studio/software).
Регуляторика по автономиям (контент для статей):
[Comunidad de Madrid — tatuajes y piercing](https://www.comunidad.madrid/inversion-empresa/tatuajes-piercing-proteccion-consumidores),
[Consumo Responde (Andalucía)](https://www.consumoresponde.es/art%C3%ADculos/tatuajes_micropigmentacion_y_perforacion_cutanea).

**Бьюти**

| Интент | Запросы |
|---|---|
| Коммерческий | software salón de belleza, programa gestión peluquería, agenda online estética, reservas online peluquería, app citas salón de belleza, software centro de estética |
| Сравнение | alternativa a Booksy, alternativa a Fresha, Fresha vs Booksy, Treatwell comisión, software peluquería sin comisiones |
| Информационный | cómo reducir no-shows peluquería, recordatorios de cita WhatsApp, Verifactu peluquería, ficha de cliente estética RGPD |

Конкуренты и цены (2026, по вторичным источникам, проверить на сайтах): Booksy ≈ 34,99 €/мес + 8 € за
сотрудника; Fresha — 0 €/мес + 2,19–2,6 % с онлайн-оплат; Treatwell — 25 % с новых клиентов из маркетплейса;
Bewe от ≈ 40 €/мес ([обзор 1](https://www.lavozdemedinadigital.com/wordpress/2026/03/las-6-mejores-apps-de-reservas-online-para-salones-de-belleza-en-2026/),
[обзор 2](https://gironanoticies.com/noticia/290471-6-programas-de-software-de-reservas-online-para-peluquerias-y-salones-de-belleza-guia-2026.htm)).
Угол «без комиссий, без маркетплейса, свои клиенты — свои» — против Treatwell/Fresha.

Для каждого кластера — одна страница. Коммерческие → посадочные (`/funciones/...`, `/precios`,
`/alternativa-a-...`), информационные → статьи в блоге (TASK-767). Одна страница — один интент, иначе
страницы каннибализируют друг друга.

---

## 3. Контент: что и сколько публиковать

Правила Google: [Creating helpful content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
и [Spam policies — scaled content abuse](https://developers.google.com/search/docs/essentials/spam-policies#scaled-content-abuse).
Из них следует: генерировать 50 городских страниц с одним шаблоном нельзя; 5 страниц с реальной
региональной фактурой (нормативы автономий для тату) — можно.

Ритм, который один человек выдерживает: **1 статья в неделю на один сайт, по очереди** (клубы → тату → бьюти),
то есть 4 статьи в месяц, каждая 800–1500 слов на испанском, с `ru`/`en` переводом (машинный + вычитка).

Порядок страниц для каждого сайта:

1. Главная (есть) и `/precios` (есть) — проверить, что заголовки H1/title содержат главный коммерческий запрос.
2. 3–4 посадочные по функциям под коммерческие запросы (клубы: socios / stock / app de socios / firma;
   тату: agenda / consentimiento / depósitos; бьюти: agenda online / recordatorios / fichas).
3. 2 страницы «alternativa a X» — самый быстрый коммерческий трафик в SaaS.
4. 1 «якорная» информационная статья на нишу (cómo abrir…, consentimiento informado…, cómo reducir
   no-shows…) — она собирает ссылки и показы.
5. Далее — по запросам из Search Console, у которых есть показы при позиции 8–20: дописать страницу под них.

Формат статьи, который работает и для людей, и для AI-цитирования: ответ в первых 2 абзацах, подзаголовки-
вопросы, таблица или чек-лист, дата обновления, автор (Вадим, фото, «founder PafPaf»), ссылки на
первоисточники (BOE, AEAT, сайты автономий). Каждая страница — с FAQ-блоком (JSON-LD уже есть).

ИИ как инструмент: черновик — да, публиковать без правки и без своей фактуры — нет (попадает под scaled
content abuse и не цитируется).

---

## 4. Ссылки и упоминания (off-page)

Для нового домена без ссылок позиции не приходят. Дешёвые источники:

- Каталоги ПО: Capterra/GetApp (ES), G2, Product Hunt (один запуск на бренд), AlternativeTo, SaaSHub.
- Профили: GitHub-организация, LinkedIn-страница, Crunchbase — ссылки и сущность бренда для Knowledge Graph.
- Отраслевые: для клубов — федерации (ConFAC, CatFAC), форумы, Telegram-чаты; для тату — конвенции,
  магазины расходников, школы; для бьюти — школы эстетики, поставщики.
- Гостевые статьи и комментарии к обзорам «mejores software para…» (просить добавить в список).
- Первые клиенты: бейдж «Gestionado con …» со ссылкой в футере сайта клуба/студии — это самые
  релевантные ссылки, какие только бывают.

Мерить: Ahrefs Webmaster Tools → Backlinks, раз в месяц.

---

## 5. Измерение: что смотреть и когда

**Таблица «SEO-журнал» (Google Sheets или Notion):** лист `keywords` (запрос, сайт, кластер, объём по
Keyword Planner, целевая страница, позиция по месяцам), лист `content` (дата, URL, запрос, статус индексации),
лист `links` (дата, источник, URL). Позиции берутся из Search Console → Performance → Queries (экспорт).

**Еженедельно, 20 минут (понедельник):**

1. Search Console → Performance, фильтр страна = España, сравнение с прошлой неделей: клики, показы, CTR,
   средняя позиция. Запросы с показами и позицией 8–20 — в список «дописать».
2. Search Console → Pages: все ли новые страницы в «Indexed», нет ли «Crawled — currently not indexed»
   (значит, страница слабая).
3. Plausible: визиты из `Google` / `Bing` / `ChatGPT` / `Perplexity` (реферер), конверсии «клик Probar gratis».

**Ежемесячно, 1 час (первая пятница):**

1. Обновить позиции по кластерам в `keywords`, бэклинки в `links`.
2. Core Web Vitals в Search Console и PageSpeed по 2 страницам.
3. AI-видимость вручную: 10 запросов на нишу в ChatGPT, Perplexity, Gemini, Google AI Overviews
   («mejor software para estudio de tatuajes en España» и т. п.); записать, кого цитируют и есть ли мы.
   Платные трекеры (Peec, Otterly, Profound) — не раньше, чем появится что мерить
   ([обзор инструментов](https://nogood.io/blog/best-tools-for-llm-visibility/)).
4. Короткий отчёт в Notion на странице проекта (раздел «Маркетинг — активность»): что опубликовано,
   что выросло, что делаем в следующем месяце.

Отчёт одной картинкой — [Looker Studio](https://lookerstudio.google.com/) с коннектором Search Console
(шаблон «Search Console Report» в галерее), три сайта — три страницы.

**Целевые показатели (на сайт):**

| Срок | Цель |
|---|---|
| 1 месяц | Все страницы в индексе Google и Bing; аналитика и журнал ведутся; 10+ ключей в таблице с объёмами |
| 3 месяца | 50+ показов/день; 10 ключей в топ-20; 3 статьи, 2 посадочные, 10 ссылок |
| 6 месяцев | 3–5 длиннохвостых ключей в топ-10; первые 5 регистраций из органики; упоминание хотя бы в одном AI-ответе |
| 12 месяцев | Главный коммерческий запрос ниши в топ-10; органика — основной канал регистраций |

Если через 3 месяца показов нет вовсе — проблема техническая (индексация), не контентная. Если показы есть,
кликов нет — переписать title/description и первый абзац.

---

## 6. Порядок на ближайшие 4 недели

1. Неделя 1: TASK-770 (имена и домены), Search Console + Bing + Plausible для `paf-paf.app` (это уже можно),
   таблица `keywords` с объёмами по трём нишам из Keyword Planner.
2. Неделя 2: TASK-760/761 (сборка и деплой трёх сайтов), заглушки тату и бьюти на своих доменах с
   главной и ценами — чтобы домены начали «стареть».
3. Неделя 3: первая статья для клубов («cómo abrir una asociación cannábica» или «cambiar de Excel a CRM»),
   листинг в Capterra/GetApp.
4. Неделя 4: посадочная «alternativa a …» для тату, первая статья для бьюти, первый еженедельный отчёт.

---

## Источники

Официальные:
[SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide) ·
[Search Essentials](https://developers.google.com/search/docs/essentials) ·
[Helpful content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) ·
[Spam policies](https://developers.google.com/search/docs/essentials/spam-policies) ·
[Sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview) ·
[hreflang](https://developers.google.com/search/docs/specialty/international/localized-versions) ·
[Core Web Vitals](https://developers.google.com/search/docs/appearance/core-web-vitals) ·
[AI features](https://developers.google.com/search/docs/appearance/ai-features) ·
[Structured data: SoftwareApplication](https://developers.google.com/search/docs/appearance/structured-data/software-app),
[Article](https://developers.google.com/search/docs/appearance/structured-data/article) ·
[Search Console](https://search.google.com/search-console/about) · [Bing Webmaster Tools](https://www.bing.com/webmasters) ·
[IndexNow](https://www.indexnow.org/) · [PageSpeed Insights](https://pagespeed.web.dev/) ·
[Rich Results Test](https://search.google.com/test/rich-results) ·
[Google Ads — cannabis policy (2026-03)](https://support.google.com/adspolicy/answer/16989811) ·
[AEAT — Verifactu](https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu.html).

Вторичные (проверять даты): [Verifactu 2027 — Merca2](https://www.merca2.es/2026/09/08/verifactu-obligatorio-2027-autonomos-2450605/),
[перенос на 2028 — Infoautónomos](https://www.infoautonomos.com/blog/hacienda-retrasa-entrada-vigor-verifactu/),
[e-factura плазос](https://www.sanchezgarridoabogados.com/factura-electronica-obligatoria-plazos),
[zero-click — Linkflow](https://linkflow.ai/blog/zero-click-searches/),
[LLM-visibility tools — NoGood](https://nogood.io/blog/best-tools-for-llm-visibility/),
[free rank trackers — Nightwatch](https://nightwatch.io/blog/best-free-rank-tracking-software/),
[бьюти-софт 2026 — Girona Notícies](https://gironanoticies.com/noticia/290471-6-programas-de-software-de-reservas-online-para-peluquerias-y-salones-de-belleza-guia-2026.htm),
[тату-софт — Capterra ES](https://www.capterra.es/directory/31616/tattoo-studio/software),
[CSC-софт — Marify](https://marify.app/mejores-software-para-clubes-de-cannabis-comparativa/),
[нормативы тату — Comunidad de Madrid](https://www.comunidad.madrid/inversion-empresa/tatuajes-piercing-proteccion-consumidores).
