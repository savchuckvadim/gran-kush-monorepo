import type { ServicePageContent } from "../../types";

export const aiAdoption: ServicePageContent = {
    key: "aiAdoption",
    metaTitle: "Implantación de IA en los procesos de tu empresa",
    metaDescription:
        "Auditoría de procesos, selección de casos donde la IA ahorra tiempo de verdad, implantación con tus herramientas y formación del equipo. Sin humo y con medición.",
    title: "IA en tus procesos",
    lead: "Encontramos dónde la IA ahorra horas a tu equipo, la conectamos a las herramientas que ya usáis y enseñamos a las personas a trabajar con ella.",
    intro: [
        "Casi todas las empresas ya usan IA de alguna manera: alguien redacta correos con un chat, otro resume documentos, un tercero genera imágenes. Lo que falta es método: qué tareas merecen la pena, con qué herramienta, con qué datos se puede trabajar y cómo medir si de verdad ahorra tiempo.",
        "Empezamos con una auditoría corta de los procesos: dónde se escribe lo mismo muchas veces, dónde se copian datos entre sistemas, dónde una persona lee cien páginas para encontrar una. De ahí sale una lista priorizada por ahorro y riesgo, y los dos o tres casos con los que empezar.",
        "Luego implantamos: a veces es configurar una herramienta existente y escribir las instrucciones; a veces, un agente integrado en el CRM; a veces, una política de qué datos pueden y no pueden salir de la empresa. Y siempre formación, porque la herramienta que nadie sabe usar no ahorra nada.",
    ],
    forWhom: [
        "Direcciones que quieren adoptar IA con criterio, no por moda.",
        "Equipos administrativos y comerciales con mucho texto repetitivo.",
        "Empresas con datos sensibles que necesitan reglas claras antes de usar herramientas externas.",
        "Negocios que ya probaron un chat y quieren pasar a resultados medibles.",
    ],
    deliverables: [
        {
            title: "Auditoría de procesos",
            text: "Entrevistas y observación de tareas reales. Lista de casos con horas ahorradas estimadas, riesgo y esfuerzo.",
        },
        {
            title: "Hoja de ruta",
            text: "Los primeros casos, la herramienta para cada uno, qué integrar y qué medir. Un plan de un trimestre, no de tres años.",
        },
        {
            title: "Política de uso de datos",
            text: "Qué información puede ir a qué herramienta, qué proveedores cumplen el RGPD y cómo se documenta el tratamiento.",
        },
        {
            title: "Implantación",
            text: "Configuración de herramientas, instrucciones y plantillas, o desarrollo de agentes integrados cuando el caso lo pide.",
        },
        {
            title: "Formación práctica",
            text: "Sesiones por equipo con sus propias tareas y documentos, no con ejemplos genéricos. Material de consulta después.",
        },
        {
            title: "Medición",
            text: "Antes y después de cada caso: tiempo, calidad y coste. Lo que no mejora, se retira sin drama.",
        },
    ],
    steps: [
        {
            title: "Auditoría",
            text: "Una o dos semanas de entrevistas y observación. Salimos con la lista priorizada de casos.",
        },
        {
            title: "Pilotos",
            text: "Dos o tres casos con un grupo pequeño durante un mes, medidos desde el primer día.",
        },
        {
            title: "Despliegue",
            text: "Lo que funciona se extiende al resto del equipo con formación y documentación; lo que no, se descarta.",
        },
        {
            title: "Acompañamiento",
            text: "Revisión mensual de resultados, nuevos casos y actualización de la política cuando cambian las herramientas.",
        },
    ],
    stack: [
        "Claude",
        "ChatGPT",
        "Agentes a medida",
        "Automatización de documentos",
        "Transcripción y resumen",
        "Bitrix24 e integraciones",
    ],
    faq: [
        {
            question: "¿Necesitamos comprar licencias caras?",
            answer: "Normalmente no al principio. Muchos casos se cubren con planes de equipo de las herramientas generales; las licencias se escalan cuando la medición lo justifica.",
        },
        {
            question: "¿Cómo protegemos los datos de clientes?",
            answer: "Con una política escrita de qué puede salir y a dónde, proveedores con acuerdos de tratamiento de datos y, para lo más sensible, modelos alojados en Europa o en vuestra propia infraestructura.",
        },
        {
            question: "¿Cuánto tiempo del equipo exige?",
            answer: "La auditoría ocupa una hora por persona entrevistada. Los pilotos se integran en el trabajo normal. La formación son sesiones de dos horas por equipo.",
        },
        {
            question: "¿Y si al final la IA no sirve para nuestro caso?",
            answer: "Lo sabremos tras la auditoría o, como tarde, tras el piloto, con números. Preferimos decirlo pronto a vender un proyecto largo que no mejora nada.",
        },
    ],
};
