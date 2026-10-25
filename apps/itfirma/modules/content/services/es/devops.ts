import type { ServicePageContent } from "../../types";

export const devops: ServicePageContent = {
    key: "devops",
    metaTitle: "Infraestructura, despliegue y soporte técnico",
    metaDescription:
        "Servidores, contenedores, despliegue automático, copias de seguridad, monitorización y soporte mensual para aplicaciones web. Infraestructura sencilla que un equipo pequeño puede operar.",
    title: "Infraestructura y soporte",
    lead: "Servidores que no sorprenden, despliegues en un clic y alguien que responde cuando algo falla. Sin un departamento de DevOps.",
    intro: [
        "Una aplicación en producción necesita más que código: dónde corre, cómo se actualiza sin cortes, qué pasa cuando se llena el disco, quién se entera de que algo va mal y cómo se recupera una base de datos un lunes a las nueve. Para una empresa pequeña, esa parte suele ser la que nadie quiere tener.",
        "Montamos infraestructura deliberadamente sencilla: uno o dos servidores en la UE, contenedores, un panel de despliegue, copias de seguridad probadas y monitorización que avisa por Telegram. No es Kubernetes; es lo que podemos operar nosotros y entregar documentado a cualquier otro equipo.",
        "El soporte mensual cubre lo que una aplicación viva necesita: actualizaciones de seguridad, pequeñas mejoras, revisión de registros y una respuesta acordada cuando algo falla. Para proyectos que no hemos construido nosotros, empezamos por una auditoría y una lista de riesgos.",
    ],
    forWhom: [
        "Empresas con una aplicación propia y sin equipo técnico para operarla.",
        "Productos que han crecido en un hosting compartido y empiezan a caerse.",
        "Equipos que despliegan a mano y tienen miedo de cada actualización.",
        "Negocios que necesitan alojamiento en la UE con copias y cumplimiento documentado.",
    ],
    deliverables: [
        {
            title: "Auditoría de infraestructura",
            text: "Qué hay, qué falla, qué riesgos existen y qué cuesta corregirlos. Priorizado y en lenguaje de negocio.",
        },
        {
            title: "Servidores y contenedores",
            text: "Servidores en la UE, aplicaciones en contenedores, red, certificados y acceso con llaves. Todo descrito en código.",
        },
        {
            title: "Despliegue automático",
            text: "Cada cambio se prueba y se publica solo, con posibilidad de volver atrás en minutos si algo no cuadra.",
        },
        {
            title: "Copias y recuperación",
            text: "Copias diarias de bases de datos y archivos, cifradas y fuera del servidor, con pruebas de restauración periódicas.",
        },
        {
            title: "Monitorización y alertas",
            text: "Disponibilidad, errores, disco y memoria vigilados; avisos por Telegram o correo antes de que lo note un cliente.",
        },
        {
            title: "Soporte mensual",
            text: "Horas acordadas para actualizaciones, mejoras y consultas, con tiempo de respuesta definido y un informe mensual.",
        },
    ],
    steps: [
        {
            title: "Auditoría",
            text: "Revisamos servidores, despliegues, copias y accesos. Entregamos una lista de riesgos con prioridades.",
        },
        {
            title: "Plan y presupuesto",
            text: "Qué cambiamos primero, qué cuesta y qué servidores hacen falta. Sin sobredimensionar.",
        },
        {
            title: "Migración",
            text: "Nueva infraestructura en paralelo, pruebas con datos reales y cambio en una ventana acordada, con marcha atrás preparada.",
        },
        {
            title: "Operación",
            text: "Monitorización, copias y actualizaciones en marcha; soporte mensual con revisión de registros y mejoras.",
        },
    ],
    stack: [
        "Docker",
        "Linux",
        "GitHub Actions",
        "Dokploy y Traefik",
        "PostgreSQL",
        "Redis",
        "Cloudflare",
        "Hetzner y AWS (UE)",
    ],
    faq: [
        {
            question: "¿Podéis mantener una aplicación que no habéis construido vosotros?",
            answer: "Sí, tras una auditoría. Si el código es razonable y hay documentación, asumimos el soporte; si no, proponemos primero las correcciones mínimas para que sea operable.",
        },
        {
            question: "¿Qué tiempo de respuesta ofrecéis?",
            answer: "Depende del plan: desde respuesta en el siguiente día laborable hasta atención en pocas horas para incidencias críticas. Se acuerda por escrito y se informa cada mes.",
        },
        {
            question: "¿Dónde están los servidores?",
            answer: "En la Unión Europea, normalmente en Alemania o Finlandia, con copias en otra región europea. Si tu sector exige otro proveedor, nos adaptamos.",
        },
        {
            question: "¿Cuánto cuesta la infraestructura al mes?",
            answer: "Una aplicación de negocio típica corre en servidores que cuestan entre 30 y 150 € al mes. El soporte mensual se presupuesta por horas acordadas, aparte.",
        },
    ],
};
