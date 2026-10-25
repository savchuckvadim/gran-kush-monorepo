import type { ServicePageContent } from "../../types";

export const apps: ServicePageContent = {
    key: "apps",
    metaTitle: "Desarrollo de aplicaciones web y SaaS a medida",
    metaDescription:
        "Paneles internos, áreas de cliente, CRM a medida y productos SaaS multiempresa. De la arquitectura al despliegue, con el código a tu nombre.",
    title: "Aplicaciones web y SaaS a medida",
    lead: "Herramientas internas, áreas de cliente y productos por suscripción que aguantan años de cambios sin volverse un pantano.",
    intro: [
        "Una aplicación a medida tiene sentido cuando el proceso es tuyo y ninguna herramienta de catálogo lo sigue: un flujo de aprobación particular, una forma de calcular precios, datos que viven en tres sitios a la vez. Lo que pides no es software por el software, sino que esa parte del negocio deje de depender de hojas de cálculo y memoria.",
        "Construimos aplicaciones web con la misma base técnica con la que operamos nuestros productos SaaS: TypeScript de punta a punta, API documentada, base de datos relacional, colas para el trabajo en segundo plano y despliegue automatizado. No es la arquitectura de moda; es la que podemos mantener nosotros y puede heredar otro equipo.",
        "Si el plan es vender la herramienta a otros, la diseñamos multiempresa desde el primer día: espacios aislados por cliente, roles, facturación por suscripción y un panel de administración. Es lo que hacemos con nuestros propios productos, y es más barato pensarlo al principio que reescribirlo después.",
    ],
    forWhom: [
        "Empresas cuyo proceso clave vive en hojas de cálculo, chats y memoria de una persona.",
        "Negocios que quieren un área donde el cliente consulte, firme y pague por su cuenta.",
        "Fundadores que lanzan un producto SaaS y necesitan la primera versión en producción.",
        "Equipos con una herramienta heredada que nadie se atreve a tocar.",
    ],
    deliverables: [
        {
            title: "Arquitectura y modelo de datos",
            text: "Un documento corto con entidades, roles, integraciones y decisiones técnicas. Lo revisas antes de la primera línea de código.",
        },
        {
            title: "Backend y API",
            text: "NestJS y PostgreSQL con API documentada en OpenAPI, autenticación por sesiones, permisos por rol y colas para tareas pesadas.",
        },
        {
            title: "Interfaz",
            text: "Next.js y React: rápida, accesible, en los idiomas que necesites, con componentes reutilizables y estados de carga y error pensados.",
        },
        {
            title: "Multiempresa y facturación",
            text: "Espacios aislados por cliente, planes, periodos de prueba y cobro por suscripción cuando el producto se vende a terceros.",
        },
        {
            title: "Pruebas y CI",
            text: "Pruebas automáticas de la lógica crítica y comprobaciones en cada cambio, para que una mejora no rompa lo que ya funciona.",
        },
        {
            title: "Despliegue y entrega",
            text: "Contenedores, entorno de pruebas y producción, copias de seguridad y monitorización. Repositorio y cuentas a tu nombre.",
        },
    ],
    steps: [
        {
            title: "Descubrimiento",
            text: "Entrevistas con quien usará la herramienta, revisión de lo que existe y un alcance por etapas con la primera versión usable al frente.",
        },
        {
            title: "Diseño de la solución",
            text: "Modelo de datos, pantallas clave y arquitectura. Decidimos juntos qué entra en la primera etapa y qué espera.",
        },
        {
            title: "Desarrollo por etapas",
            text: "Entregas cada una o dos semanas en un entorno de pruebas. Cada etapa se usa de verdad antes de empezar la siguiente.",
        },
        {
            title: "Producción y evolución",
            text: "Lanzamiento, formación y un plan de mejoras. Después, soporte mensual o desarrollo por horas, según el ritmo del producto.",
        },
    ],
    stack: [
        "TypeScript",
        "Next.js",
        "React",
        "NestJS",
        "PostgreSQL",
        "Prisma",
        "Redis",
        "Docker",
        "Stripe",
    ],
    faq: [
        {
            question: "¿Por qué no usar una herramienta sin código?",
            answer: "Para probar una idea, úsala. Cuando el proceso se complica, los datos crecen o hay que integrar varios sistemas, el coste de pelear con la herramienta supera al de construir la tuya. Te lo decimos con franqueza en la primera conversación si tu caso aún no llega a ese punto.",
        },
        {
            question: "¿Podemos empezar pequeño?",
            answer: "Es la única forma que recomendamos. La primera etapa resuelve el problema más caro con el mínimo de pantallas; el resto se añade cuando el uso real lo pide.",
        },
        {
            question: "¿Qué pasa si queremos cambiar de proveedor después?",
            answer: "Te llevas todo: repositorio, documentación, infraestructura y base de datos. Usamos tecnologías comunes precisamente para que cualquier equipo de TypeScript pueda continuar.",
        },
        {
            question: "¿Hacéis también el diseño?",
            answer: "Sí. Para interfaces de trabajo diseñamos directamente en código sobre un sistema de componentes; para productos con marca fuerte sumamos a un diseñador de confianza al proyecto.",
        },
    ],
};
