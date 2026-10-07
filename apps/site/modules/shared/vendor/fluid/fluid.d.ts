export interface FluidOptions {
    simResolution?: number;
    dyeResolution?: number;
    densityDissipation?: number;
    velocityDissipation?: number;
    pressure?: number;
    pressureIterations?: number;
    curl?: number;
    splatRadius?: number;
    splatForce?: number;
    intensity?: number;
    invert?: boolean;
    colors?: [number, number, number][];
}

export interface Fluid {
    move(clientX: number, clientY: number): void;
    burst(clientX: number, clientY: number, count?: number): void;
    rise(count?: number): void;
    puff(count?: number): void;
    setOptions(next: FluidOptions): void;
    start(): void;
    stop(): void;
}

export declare function createFluid(
    canvas: HTMLCanvasElement,
    options?: FluidOptions
): Fluid | null;
