export interface AboutUsPrinciple {
    title: string;
    description: string;
}

export interface AboutUsPageContent {
    title: string;
    subtitle: string;
    introTitle: string;
    introText: string;
    detailsTitle: string;
    detailsText: string;
    principlesTitle: string;
    principles: AboutUsPrinciple[];
    valuesTitle: string;
    values: string[];
    footer: string;
}

export type AboutUsTranslationKey =
    | "title"
    | "subtitle"
    | "introTitle"
    | "introText"
    | "detailsTitle"
    | "detailsText"
    | "principlesTitle"
    | "principleOneTitle"
    | "principleOneText"
    | "principleTwoTitle"
    | "principleTwoText"
    | "principleThreeTitle"
    | "principleThreeText"
    | "valuesTitle"
    | "valueOne"
    | "valueTwo"
    | "valueThree"
    | "valueFour"
    | "valueFive"
    | "valueSix"
    | "footer";
