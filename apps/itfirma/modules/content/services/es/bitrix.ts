import type { ServicePageContent } from "../../types";

export const bitrix: ServicePageContent = {
    key: "bitrix",
    metaTitle: "Implantación de Bitrix24 llave en mano",
    metaDescription:
        "Configuramos Bitrix24 alrededor de tu proceso de venta: embudos, automatizaciones, telefonía, informes, migración de datos, formación y aplicaciones propias cuando la configuración no llega.",
    title: "Bitrix24 llave en mano",
    lead: "Un CRM configurado alrededor de cómo vende tu equipo, con automatizaciones que ahorran clics y datos que el responsable ve sin preguntar.",
    intro: [
        "Bitrix24 trae CRM, tareas, telefonía, chats y automatizaciones en una sola suscripción. Esa es su fuerza y su trampa: un portal recién creado tiene cientos de opciones y ninguna refleja tu negocio. El resultado habitual es un CRM que los comerciales rellenan a regañadientes y del que la dirección no se fía.",
        "Nosotros empezamos por el proceso, no por las pantallas. Describimos contigo cómo entra un cliente, qué pasa en cada llamada, quién decide y cuándo se pierde una venta. Después trasladamos ese proceso al portal: embudos, campos, automatizaciones, roles y los informes que de verdad se miran.",
        "Donde la configuración estándar no llega, desarrollamos aplicaciones para tu portal sobre la REST API: formularios de una pantalla en la ficha, robots a medida, paneles de KPI y sincronización con otros sistemas. Las mismas aplicaciones funcionan en varios portales a la vez, así que una red de oficinas o franquicias se administra desde un sitio.",
    ],
    forWhom: [
        "Equipos de venta activa que llaman, presentan y hacen seguimiento durante meses.",
        "Empresas que ya tienen Bitrix24 y no lo usan, o lo usan como una libreta cara.",
        "Redes de oficinas o distribuidores que necesitan el mismo proceso en varios portales.",
        "Negocios que migran desde hojas de cálculo u otro CRM sin perder el historial.",
    ],
    deliverables: [
        {
            title: "Mapa del proceso de venta",
            text: "Etapas, responsables, puntos de pérdida y qué dato se recoge en cada paso. Es el documento sobre el que se configura todo lo demás.",
        },
        {
            title: "Portal configurado",
            text: "Embudos, campos, tarjetas de cliente, roles y permisos, plantillas de correo y documentos. Sin campos que nadie rellena.",
        },
        {
            title: "Automatizaciones y robots",
            text: "Tareas y recordatorios automáticos, cambios de etapa por eventos, avisos al responsable cuando un cliente se enfría.",
        },
        {
            title: "Telefonía y mensajería",
            text: "Llamadas desde la ficha con grabación, formulario de informe tras la llamada, WhatsApp y Telegram en el mismo chat del CRM.",
        },
        {
            title: "Informes para la dirección",
            text: "Conversión por etapa y por comercial, actividad diaria, motivos de pérdida. En el propio Bitrix24 o en un panel aparte.",
        },
        {
            title: "Formación y manual",
            text: "Sesiones con el equipo en su portal, un manual corto con capturas y las primeras semanas de ajustes incluidas.",
        },
    ],
    steps: [
        {
            title: "Auditoría del proceso",
            text: "Dos o tres sesiones con la dirección y con comerciales. Salimos con el mapa del proceso y la lista de lo que se automatiza.",
        },
        {
            title: "Configuración",
            text: "Montamos el portal en un entorno de pruebas con datos reales anonimizados. Revisas cada embudo antes de que lo vea el equipo.",
        },
        {
            title: "Migración y lanzamiento",
            text: "Importamos clientes y tratos, conectamos telefonía y web, formamos al equipo y arrancamos un lunes con soporte en directo.",
        },
        {
            title: "Ajuste",
            text: "Durante las primeras semanas corregimos lo que la práctica cambia: un campo sobrante, un robot que molesta, un informe que falta.",
        },
    ],
    stack: [
        "Bitrix24 REST API",
        "Aplicaciones de marketplace",
        "Robots y procesos de negocio",
        "Telefonía SIP y VoIP",
        "WhatsApp y Telegram",
        "NestJS",
        "PostgreSQL",
    ],
    faq: [
        {
            question: "¿Trabajáis con portales en la nube y con instalaciones propias?",
            answer: "Sí. La mayoría de clientes usan la nube de Bitrix24; para instalaciones on-premise aplicamos las mismas aplicaciones y automatizaciones, con el despliegue en vuestro servidor.",
        },
        {
            question: "¿Tenemos que comprar la licencia a través de vosotros?",
            answer: "No. La licencia la contratas directamente con Bitrix24 o con quien prefieras; nosotros cobramos por el trabajo de implantación, no por la suscripción.",
        },
        {
            question:
                "Ya tenemos Bitrix24 configurado y no funciona. ¿Se puede arreglar sin empezar de cero?",
            answer: "Casi siempre. Auditamos el portal, mantenemos lo que sirve, quitamos campos y robots muertos y volvemos a formar al equipo. Empezar de cero solo si el historial no vale nada.",
        },
        {
            question: "¿Cuánto tarda una implantación?",
            answer: "De tres a ocho semanas. Un equipo pequeño con un embudo claro arranca en tres; una red con telefonía, varios portales y aplicaciones propias se acerca a dos meses.",
        },
    ],
};
