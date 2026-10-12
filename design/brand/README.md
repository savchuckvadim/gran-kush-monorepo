# Бренд: лого и леттеринги

Исходники от Вадима. В код идут не напрямую, а через компоненты в `apps/crm/modules/shared/ui/Brand`
(CRM) и `apps/site/modules/sites/pafpaf/ui/svg-defs.tsx` (сайт).

| Файл | Что это | Где используется |
|---|---|---|
| `lettering-blackmetal.svg` / `.png` | Леттеринг «paf paf» в стиле блэк-метал: чёрный, с венами и шипами. 1633×1135, SVG — 4 path, один `fill` | Тема **Infierno** в CRM (TASK-630): надпись в сайдбаре вместо текстовой. В светлых темах не используется |

Знак PafPaf (два круга с градиентом) живёт только в коде: `BrandMark` в CRM и `LogoMark` на сайте.

Перед использованием SVG из этой папки чистить (svgo), ставить `fill="currentColor"` и обрезать
`viewBox` по контуру — исходник экспортирован из рисовалки с полями.

Чистая копия леттеринга — `apps/crm/public/brand/lettering-blackmetal.svg`: без `transform`
potrace, координаты в целых пикселях, `viewBox` по контуру (1519×855), 23 КБ вместо 37. В CRM
она идёт CSS-маской (`shell.css`, слоты `brand-lettering` и `brand-initial`), цвет задаёт тема.
