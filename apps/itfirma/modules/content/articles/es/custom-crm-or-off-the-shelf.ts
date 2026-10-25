import type { ArticleContent } from "../../types";

export const customCrmOrOffTheShelf: ArticleContent = {
    title: "¿CRM a medida o de catálogo? Cómo decidirlo en una conversación",
    description:
        "Cuatro preguntas que separan a las empresas que deben configurar una herramienta existente de las que necesitan construir la suya. Con los costes ocultos de cada camino.",
    date: "2026-10-12",
    readingMinutes: 6,
    intro: "Nos llegan las dos peticiones con la misma frecuencia: «queremos nuestro propio CRM» y «queremos que nos configuren Bitrix24». Y con la misma frecuencia recomendamos lo contrario de lo que pedían. La decisión depende de cuatro preguntas, y se puede responder en media hora.",
    sections: [
        {
            heading: "¿El proceso es tuyo o es el del sector?",
            paragraphs: [
                "Si vendes como vende todo el mundo en tu sector, con contacto, propuesta, negociación y cierre, cualquier CRM serio lo cubre y la diferencia está en la configuración. Si tu ventaja está en cómo trabajas, un cálculo de precios propio, un flujo de aprobación particular, datos que ninguna herramienta modela, entonces la herramienta de catálogo te obligará a renunciar a esa ventaja o a vivir con parches.",
                "La prueba rápida: escribe en una página cómo entra un cliente y qué pasa hasta que paga. Si el texto cabe en los conceptos estándar de un CRM, configura. Si cada segundo párrafo empieza por «en nuestro caso», construye.",
            ],
        },
        {
            heading: "¿Cuántas personas lo usarán y cuánto cuesta su tiempo?",
            paragraphs: [
                "Una herramienta de catálogo cobra por usuario y por mes, para siempre. Una herramienta propia cuesta construirla y luego mantenerla. Con cinco usuarios, la suscripción gana casi siempre. Con cincuenta, y más si cada clic de más les cuesta minutos al día, la aritmética cambia a los dos o tres años.",
                "Hay un segundo coste que nadie pone en la hoja: el de las tareas que la herramienta no hace y alguien termina haciendo a mano. Ese coste suele ser el que decide.",
            ],
        },
        {
            heading: "¿Con qué tiene que hablar?",
            paragraphs: [
                "Un CRM aislado es raro. Tiene que recibir pedidos de la web, mandar facturas a contabilidad, avisar por mensajería, leer la centralita. Las herramientas de catálogo tienen integraciones para los sistemas populares; para los demás, hay que construirlas igualmente.",
                "Si la mayor parte del valor está en esas conexiones, a veces la mejor respuesta es una tercera: un CRM de catálogo en el centro y una capa propia alrededor, con integraciones y pequeñas aplicaciones. Es lo que hacemos a menudo con Bitrix24.",
            ],
        },
        {
            heading: "¿Vas a vender la herramienta?",
            paragraphs: [
                "Si el plan es que otros negocios paguen por usarla, la pregunta ya no es si construir, sino cómo: multiempresa desde el primer día, facturación por suscripción, panel de administración y una arquitectura que aguante clientes que no conoces. Eso es un producto, y se planifica como tal.",
            ],
            bullets: [
                "Proceso estándar y pocos usuarios: configura una herramienta existente.",
                "Proceso propio y equipo grande: construye, por etapas.",
                "Valor en las conexiones: catálogo en el centro, capa propia alrededor.",
                "Vas a venderlo: producto SaaS desde el diseño.",
            ],
        },
    ],
    outro: "Si dudas entre los dos caminos, cuéntanos tu proceso en unas líneas. Te diremos con franqueza cuál recomendamos, aunque sea el que no nos da trabajo.",
    relatedService: "apps",
};
