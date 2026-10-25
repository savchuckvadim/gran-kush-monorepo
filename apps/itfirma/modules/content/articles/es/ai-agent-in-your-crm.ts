import type { ArticleContent } from "../../types";

export const aiAgentInYourCrm: ArticleContent = {
    title: "Un agente de IA en tu CRM: lo que hace de verdad y lo que no deberías esperar",
    description:
        "Qué tareas de un equipo comercial puede asumir hoy un agente de IA, cómo se controla lo que produce y por qué el primer caso debe ser aburrido.",
    date: "2026-10-05",
    readingMinutes: 6,
    intro: "Cada semana alguien nos pregunta si puede «poner IA en el CRM». La respuesta es sí, y la pregunta correcta es otra: para qué tarea concreta, con qué datos y quién revisa el resultado. Este artículo recoge lo que hemos aprendido construyendo agentes que trabajan dentro de Bitrix24 y de sistemas a medida.",
    sections: [
        {
            heading: "Qué es un agente, sin marketing",
            paragraphs: [
                "Un agente es un programa que recibe un contexto, la grabación de una llamada, una ficha de cliente, los correos de la semana, decide qué hacer siguiendo instrucciones y produce un resultado en un sistema: un resumen en la ficha, una tarea, un borrador de respuesta, una fila en un informe. El modelo de lenguaje es una pieza; el resto es integración, permisos y control.",
                "La diferencia con un chat es que el agente no espera a que alguien le pregunte. Se ejecuta cuando ocurre algo, termina una llamada, llega un correo, cambia una etapa, y deja el resultado donde el equipo ya mira.",
            ],
        },
        {
            heading: "Las tareas que funcionan hoy",
            paragraphs: [
                "Hay un grupo de tareas en las que un agente bien integrado ahorra tiempo desde la primera semana. Todas comparten tres rasgos: tienen entrada clara, se puede comprobar si el resultado es bueno y una persona puede corregirlo en segundos.",
            ],
            bullets: [
                "Resumir una llamada grabada y rellenar el informe de la ficha para que el comercial solo confirme.",
                "Clasificar correos y solicitudes entrantes, asignarlos y proponer la primera respuesta.",
                "Preparar el informe semanal de la dirección a partir de los datos del CRM, con las cifras y lo que cambió.",
                "Responder preguntas internas sobre tarifas, procedimientos y documentos, citando la fuente.",
                "Detectar fichas incompletas o duplicadas y proponer la corrección.",
            ],
        },
        {
            heading: "Lo que no deberías esperar",
            paragraphs: [
                "Un agente no va a vender por ti ni a sustituir al comercial que conoce al cliente. Tampoco va a acertar siempre: se equivocará en los casos raros y hay que diseñar para ello. Y no va a arreglar un CRM con datos malos; si las fichas están vacías, el agente resumirá vacío.",
                "Por eso el primer caso debe ser aburrido. Un resumen de llamada que alguien confirma antes de guardarse. Una clasificación que propone y no decide. Cuando la calidad está medida durante unas semanas, se automatizan los casos seguros y se deja la revisión para los dudosos.",
            ],
        },
        {
            heading: "Datos, costes y control",
            paragraphs: [
                "Tres preguntas antes de empezar. Qué datos ve el agente y por dónde pasan: usamos las API empresariales de los proveedores, que no entrenan con tus datos, o modelos alojados en Europa cuando hace falta. Cuánto cuesta cada ejecución: un resumen de llamada vale céntimos, y lo medimos desde el prototipo. Y cómo se revisa: cada acción queda registrada y se puede deshacer.",
                "Con esas tres respuestas escritas, un agente se construye en semanas, no en meses, y se amplía caso a caso con números delante.",
            ],
        },
    ],
    outro: "Si tienes una tarea repetitiva con datos en el CRM, es probable que sea un buen primer caso. Descríbela en unas líneas y te diremos si merece un prototipo de dos semanas.",
    relatedService: "ai",
};
