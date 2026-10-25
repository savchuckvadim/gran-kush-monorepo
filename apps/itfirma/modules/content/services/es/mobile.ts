import type { ServicePageContent } from "../../types";

export const mobile: ServicePageContent = {
    key: "mobile",
    metaTitle: "Desarrollo de apps móviles para iOS y Android",
    metaDescription:
        "Aplicaciones móviles con una sola base de código para iOS y Android: acceso, pagos, notificaciones, modo sin conexión y publicación en App Store y Google Play.",
    title: "Apps móviles",
    lead: "Una base de código, dos tiendas: apps para clientes y para equipos en campo, con backend propio y publicación incluida.",
    intro: [
        "La mayoría de las apps de negocio no necesitan dos equipos nativos. Con React Native y Expo escribimos una sola aplicación que se publica en App Store y Google Play, comparte lógica con tu web y se actualiza sin esperar a la revisión de las tiendas cuando el cambio es solo de interfaz.",
        "Lo que distingue una app útil de un icono olvidado es el backend y los detalles: inicio de sesión sin fricción, notificaciones que llegan cuando importan, trabajo sin cobertura que se sincroniza después, pagos que no fallan. Diseñamos esas piezas antes que las pantallas.",
        "Si ya tienes una aplicación web o una CRM, la app móvil se conecta a la misma API: el cliente ve sus citas o pedidos, el empleado marca presencia o escanea un código, y todo queda en un único sistema.",
    ],
    forWhom: [
        "Negocios con clientes recurrentes que reservan, piden o consultan desde el móvil.",
        "Equipos en campo que necesitan registrar trabajo, firmas o fotos sin cobertura.",
        "Productos SaaS que añaden una app a su aplicación web existente.",
        "Empresas con una app antigua que ya no pasa las revisiones de las tiendas.",
    ],
    deliverables: [
        {
            title: "App para iOS y Android",
            text: "Una base de código en React Native con Expo, interfaz nativa en cada plataforma y actualizaciones por aire para cambios de interfaz.",
        },
        {
            title: "Backend y API",
            text: "Servidor propio o conexión a tu sistema actual, con autenticación, permisos y sincronización de datos.",
        },
        {
            title: "Acceso y notificaciones",
            text: "Inicio de sesión por correo, teléfono, Google o Apple; notificaciones push segmentadas y enlaces profundos.",
        },
        {
            title: "Pagos y suscripciones",
            text: "Cobros con tarjeta, suscripciones de tienda cuando aplica y facturación conectada a tu contabilidad.",
        },
        {
            title: "Publicación en tiendas",
            text: "Cuentas de desarrollador, fichas, capturas, políticas de privacidad y respuestas a la revisión hasta la aprobación.",
        },
        {
            title: "Analítica y soporte",
            text: "Registro de errores, métricas de uso y un canal para publicar correcciones en horas, no semanas.",
        },
    ],
    steps: [
        {
            title: "Alcance y prototipo",
            text: "Definimos las pantallas imprescindibles y las probamos en un prototipo navegable antes de programar.",
        },
        {
            title: "Backend primero",
            text: "API, datos y notificaciones listos y probados; la app se construye sobre algo que ya funciona.",
        },
        {
            title: "Desarrollo y pruebas",
            text: "Versiones de prueba en tu teléfono cada una o dos semanas a través de TestFlight y Google Play interno.",
        },
        {
            title: "Publicación y seguimiento",
            text: "Envío a las tiendas, respuesta a la revisión y las primeras semanas de ajustes con los usuarios reales.",
        },
    ],
    stack: [
        "React Native",
        "Expo",
        "TypeScript",
        "NestJS",
        "PostgreSQL",
        "Push (APNs, FCM)",
        "Stripe",
    ],
    faq: [
        {
            question: "¿Nativo o multiplataforma?",
            answer: "Para apps de negocio, multiplataforma con React Native: un equipo, un código, dos tiendas. Recomendamos nativo solo cuando la app depende de hardware o rendimiento gráfico extremo, y en ese caso te lo decimos.",
        },
        {
            question: "¿Cuánto cuesta mantener una app?",
            answer: "Las tiendas cambian sus requisitos cada año y los sistemas operativos cada otoño. Reservamos un soporte mensual pequeño para actualizaciones, certificados y correcciones; el resto depende de cuánto evolucione el producto.",
        },
        {
            question: "¿Publicáis con nuestra cuenta de desarrollador?",
            answer: "Sí, siempre con la vuestra. Así la app, las reseñas y los ingresos son vuestros desde el primer día.",
        },
        {
            question: "¿Y si la tienda rechaza la app?",
            answer: "Preparamos la ficha y las políticas pensando en la revisión, y respondemos a las objeciones hasta la aprobación. Está incluido en el proyecto.",
        },
    ],
};
