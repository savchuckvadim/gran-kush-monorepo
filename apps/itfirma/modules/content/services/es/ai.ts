import type { ServicePageContent } from "../../types";

export const ai: ServicePageContent = {
    key: "ai",
    metaTitle: "Desarrollo de agentes de IA integrados en tu CRM",
    metaDescription:
        "Asistentes de IA que trabajan dentro de tus sistemas: resumen llamadas, rellenan el CRM, responden a clientes y preparan informes, con control humano y datos bajo el RGPD.",
    title: "Agentes de IA",
    lead: "Asistentes que leen tus datos, hacen el trabajo repetitivo y dejan la decisión a las personas. Dentro de tu CRM, no en una pestaña aparte.",
    intro: [
        "Un agente de IA útil no es un chat genérico. Es un programa que recibe un contexto concreto, la grabación de una llamada, la ficha de un cliente, los correos de la semana, y produce un resultado concreto: un resumen en la ficha, una tarea para el comercial, un borrador de respuesta, un informe para la dirección. Lo construimos alrededor de un caso de uso, no alrededor de una tecnología.",
        "La parte difícil no es el modelo, sino todo lo que lo rodea: qué datos puede ver, cómo se conecta al CRM, qué hace cuando no está seguro, cómo se revisa lo que produce y cuánto cuesta cada ejecución. Esa es la parte que construimos con cuidado, con registro de cada acción y un humano en el circuito donde la decisión importa.",
        "Trabajamos con Claude y OpenAI a través de sus API europeas o con modelos alojados por ti cuando los datos no pueden salir. Para que el agente responda sobre tus documentos usamos búsqueda sobre tu propia base de conocimiento, sin entrenar nada con datos de clientes.",
    ],
    forWhom: [
        "Equipos de venta que quieren resúmenes y tareas automáticas después de cada llamada.",
        "Atención al cliente con muchas preguntas repetidas y un historial que nadie consulta.",
        "Dirección que necesita informes semanales a partir de datos dispersos.",
        "Empresas que ya usan Bitrix24 u otro CRM y quieren la IA dentro de la ficha.",
    ],
    deliverables: [
        {
            title: "Caso de uso definido",
            text: "Entrada, salida, criterio de calidad y qué pasa cuando el agente no está seguro. Un documento de una página que acota el proyecto.",
        },
        {
            title: "Agente integrado",
            text: "Conectado a tu CRM, telefonía o correo: lee el contexto, actúa y escribe el resultado donde el equipo ya trabaja.",
        },
        {
            title: "Base de conocimiento",
            text: "Tus documentos, tarifas y procedimientos indexados para que el agente responda con tu información y cite de dónde la saca.",
        },
        {
            title: "Control humano",
            text: "Borradores que alguien aprueba, acciones que se registran y un botón para corregir al agente cuando se equivoca.",
        },
        {
            title: "Evaluación y costes",
            text: "Conjunto de casos de prueba, medición de calidad antes de cada cambio y panel con el coste por ejecución.",
        },
        {
            title: "Privacidad",
            text: "Datos mínimos necesarios, proveedores con sede en la UE o modelos propios, y el registro de tratamiento que pide el RGPD.",
        },
    ],
    steps: [
        {
            title: "Selección del caso",
            text: "Elegimos una tarea repetitiva, medible y con datos disponibles. Si no hay una así, lo decimos y no vendemos humo.",
        },
        {
            title: "Prototipo con datos reales",
            text: "En una o dos semanas el agente procesa casos históricos y comparamos su salida con la de las personas.",
        },
        {
            title: "Integración",
            text: "Conexión al CRM o al canal, permisos, registro de acciones y el circuito de revisión humana.",
        },
        {
            title: "Puesta en marcha y mejora",
            text: "Arranque con un grupo pequeño, medición semanal de calidad y coste, ampliación al resto del equipo.",
        },
    ],
    stack: [
        "Claude API",
        "OpenAI API",
        "RAG y búsqueda vectorial",
        "Transcripción de audio",
        "Bitrix24 API",
        "NestJS",
        "PostgreSQL",
    ],
    faq: [
        {
            question: "¿Nuestros datos se usan para entrenar modelos?",
            answer: "No. Usamos las API empresariales de los proveedores, que no entrenan con los datos enviados, o modelos alojados por ti. Lo que el agente aprende de tus documentos vive en tu base de conocimiento, no en el modelo.",
        },
        {
            question: "¿Cuánto cuesta cada ejecución?",
            answer: "Depende del modelo y del tamaño del contexto. Un resumen de llamada suele costar céntimos. Medimos el coste desde el prototipo y lo mostramos en un panel para que no haya sorpresas.",
        },
        {
            question: "¿Y si el agente se equivoca?",
            answer: "Se equivocará a veces, por eso diseñamos el circuito de revisión: borradores que se aprueban, acciones reversibles y registro de todo. Con el tiempo, los casos corregidos entran en las pruebas y la calidad sube.",
        },
        {
            question: "¿Puede el agente llamar o escribir a clientes por su cuenta?",
            answer: "Puede, pero rara vez lo recomendamos al principio. Empezamos con agentes que preparan y una persona que envía; cuando la calidad está medida, se automatizan los casos seguros.",
        },
    ],
};
