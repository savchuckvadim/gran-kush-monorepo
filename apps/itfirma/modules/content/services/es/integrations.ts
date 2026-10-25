import type { ServicePageContent } from "../../types";

export const integrations: ServicePageContent = {
    key: "integrations",
    metaTitle: "Integraciones entre CRM, web, telefonía y contabilidad",
    metaDescription:
        "Conectamos los sistemas que ya usas: CRM, web, telefonía, pagos, contabilidad y mensajería. Datos que fluyen solos, sin copiar a mano ni perder pedidos.",
    title: "Integraciones",
    lead: "Que el pedido de la web aparezca en el CRM, la factura en contabilidad y el aviso en el móvil del responsable, sin que nadie copie nada.",
    intro: [
        "La mayoría de las empresas no tienen un problema de falta de software, sino de software que no se habla. El pedido entra por la web, alguien lo copia al CRM, otro lo pasa a la contabilidad y un tercero avisa por WhatsApp. Cada paso a mano es un retraso y un error esperando a ocurrir.",
        "Una integración bien hecha es aburrida: un evento en un sistema produce un cambio en otro, con reintentos si algo falla, un registro de lo que pasó y una alerta si algo no cuadra. Las construimos sobre las API oficiales de cada herramienta y sobre colas, para que una caída de una parte no pierda datos de la otra.",
        "Trabajamos a menudo con Bitrix24 como centro, pero conectamos cualquier sistema con API: tiendas en línea, pasarelas de pago, centralitas, programas de facturación, WhatsApp y Telegram, hojas de cálculo que por ahora nadie quiere abandonar.",
    ],
    forWhom: [
        "Empresas con varios sistemas y una persona que los sincroniza a mano.",
        "Tiendas y servicios en línea cuyos pedidos deben llegar al CRM y a la contabilidad.",
        "Equipos de venta que quieren llamadas, mensajes y formularios dentro de la ficha del cliente.",
        "Negocios que quieren avisos automáticos en Telegram o WhatsApp sin un bot más que mantener.",
    ],
    deliverables: [
        {
            title: "Mapa de flujos de datos",
            text: "Qué sistema es dueño de cada dato, qué evento dispara qué cambio y qué pasa si algo falla. Una página que todos entienden.",
        },
        {
            title: "Conectores sobre API oficiales",
            text: "Integraciones con la API de cada herramienta, con autenticación segura, límites respetados y versiones controladas.",
        },
        {
            title: "Colas y reintentos",
            text: "Los eventos se encolan y se reintentan; si un sistema está caído, el dato espera en lugar de perderse.",
        },
        {
            title: "Registro y alertas",
            text: "Cada sincronización deja rastro. Si algo no cuadra, el responsable recibe un aviso con el enlace al registro.",
        },
        {
            title: "Bots de mensajería",
            text: "Avisos y respuestas por Telegram y WhatsApp conectados al CRM: nuevos pedidos, recordatorios de cita, confirmaciones.",
        },
        {
            title: "Documentación y traspaso",
            text: "Diagramas, variables de entorno y un manual de operación para que tu equipo o cualquier proveedor pueda mantenerlo.",
        },
    ],
    steps: [
        {
            title: "Inventario",
            text: "Listamos sistemas, accesos y qué dato vive dónde. Detectamos duplicados y dueños poco claros antes de conectar nada.",
        },
        {
            title: "Diseño del flujo",
            text: "Decidimos qué sistema manda en cada dato y qué eventos se propagan. Lo validamos contigo con ejemplos reales.",
        },
        {
            title: "Construcción y pruebas",
            text: "Conectores con datos de prueba, simulación de fallos y comprobación de volúmenes reales antes de tocar producción.",
        },
        {
            title: "Puesta en marcha",
            text: "Activación por partes, seguimiento de los registros las primeras semanas y ajuste de reglas con el equipo.",
        },
    ],
    stack: [
        "REST y webhooks",
        "Bitrix24 API",
        "Stripe",
        "Telegram Bot API",
        "WhatsApp Cloud API",
        "BullMQ y Redis",
        "NestJS",
        "PostgreSQL",
    ],
    faq: [
        {
            question: "¿Usáis Zapier o Make?",
            answer: "Para un flujo sencillo y poco volumen pueden valer, y te lo diremos. Cuando hay lógica de negocio, volumen o datos personales, construimos la integración en código: es más barata de mantener al cabo de un año y no depende de la tarifa de un tercero.",
        },
        {
            question: "Nuestro sistema no tiene API. ¿Se puede integrar?",
            answer: "A menudo sí: exportaciones programadas, bases de datos accesibles o archivos intercambiados por carpeta. Lo estudiamos en el inventario y te decimos qué es viable y qué no merece la pena.",
        },
        {
            question: "¿Qué pasa si una de las herramientas cambia su API?",
            answer: "Los conectores están aislados y versionados; un cambio en una herramienta se corrige en un sitio. Con soporte mensual, esas actualizaciones están cubiertas.",
        },
        {
            question: "¿Cuánto cuesta una integración?",
            answer: "Una conexión concreta entre dos sistemas suele quedar por debajo de 3.000 €. Un mapa completo con varios sistemas, colas y mensajería se presupuesta por etapas tras el inventario.",
        },
    ],
};
