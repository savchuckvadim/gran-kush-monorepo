import type { ServicePageContent } from "../../types";

export const web: ServicePageContent = {
    key: "web",
    metaTitle: "Desarrollo de webs y landing pages",
    metaDescription:
        "Sitios corporativos y landing pages rápidos, multilingües y preparados para SEO, con panel de contenidos y formularios conectados a tu CRM.",
    title: "Webs y landing pages",
    lead: "Un sitio que carga rápido, se encuentra en Google y convierte visitas en solicitudes que llegan directamente a tu CRM.",
    intro: [
        "Una web corporativa tiene un trabajo: que la persona adecuada entienda en diez segundos qué haces y te escriba. Todo lo demás, la animación, el gestor de contenidos, los idiomas, está al servicio de eso. Por eso empezamos por el texto y la estructura, y solo después por el diseño.",
        "Construimos con Next.js: páginas generadas de antemano, imágenes optimizadas y puntuaciones altas en Core Web Vitals sin trucos. El contenido se edita desde un panel sencillo o, para sitios pequeños, directamente en archivos que versionamos contigo. Cada idioma tiene su URL, sus metadatos y su mapa del sitio.",
        "Los formularios no mueren en un buzón: entran en tu CRM o en Bitrix24 con origen, idioma y página, y avisan por Telegram o correo. Si vendes servicios, la web es la primera pieza del embudo, y la conectamos como tal.",
    ],
    forWhom: [
        "Empresas de servicios que necesitan una web seria en varios idiomas.",
        "Negocios con una campaña concreta que merece una landing propia y medible.",
        "Marcas que tienen una web lenta o imposible de editar y quieren rehacerla sin perder posiciones.",
        "Productos digitales que necesitan un sitio de marketing separado de la aplicación.",
    ],
    deliverables: [
        {
            title: "Estructura y textos",
            text: "Mapa de páginas, mensajes por sección y llamadas a la acción. Escribimos o editamos el texto contigo antes de maquetar.",
        },
        {
            title: "Diseño y maquetación",
            text: "Diseño propio, adaptado a móvil, con los efectos justos para que la marca se note sin frenar la carga.",
        },
        {
            title: "Gestor de contenidos",
            text: "Panel para editar páginas, artículos y traducciones sin tocar código. Con vista previa y permisos por persona.",
        },
        {
            title: "SEO técnico",
            text: "Metadatos por idioma, datos estructurados, mapa del sitio, redirecciones desde la web anterior y medición sin cookies de seguimiento.",
        },
        {
            title: "Formularios conectados",
            text: "Solicitudes que entran en el CRM con su origen y avisan al responsable al instante. Protección contra spam sin captchas molestos.",
        },
        {
            title: "Alojamiento y mantenimiento",
            text: "Despliegue en tu propio hosting o en el nuestro, certificados, copias y actualizaciones de seguridad.",
        },
    ],
    steps: [
        {
            title: "Brief y estructura",
            text: "Una sesión para entender a quién le hablas y qué debe hacer al terminar de leer. Salimos con el mapa del sitio y los mensajes clave.",
        },
        {
            title: "Diseño",
            text: "Primero la página principal en escritorio y móvil; una vez aprobada, el resto sigue el mismo sistema.",
        },
        {
            title: "Desarrollo y contenido",
            text: "Maquetación, panel de contenidos, traducciones e integraciones. Ves el sitio en una dirección de pruebas durante todo el proceso.",
        },
        {
            title: "Lanzamiento",
            text: "Redirecciones, dominio, certificados, Search Console y una revisión de rendimiento. Después, cambios menores incluidos el primer mes.",
        },
    ],
    stack: ["Next.js", "React", "Tailwind CSS", "Payload CMS", "next-intl", "Vercel", "Docker"],
    faq: [
        {
            question: "¿Hacéis webs en WordPress?",
            answer: "No construimos sobre WordPress. Si tu sitio actual está ahí, lo migramos conservando URL y posiciones; si solo necesitas una web pequeña y barata, te lo decimos y te recomendamos a quien la haga.",
        },
        {
            question: "¿Cuánto tarda una web corporativa?",
            answer: "Una landing, de dos a cuatro semanas. Un sitio corporativo con gestor de contenidos y tres idiomas, de cuatro a ocho. El tiempo que más varía es el de los textos y las aprobaciones.",
        },
        {
            question: "¿Podremos editar el contenido nosotros?",
            answer: "Sí. El panel está pensado para quien no programa: páginas, artículos, imágenes y traducciones. Dejamos un vídeo corto y un manual.",
        },
        {
            question: "¿Incluye el posicionamiento en Google?",
            answer: "Incluye la parte técnica: velocidad, estructura, metadatos, datos estructurados e indexación. La estrategia de contenidos y enlaces se contrata aparte o se hace con tu equipo de marketing.",
        },
    ],
};
