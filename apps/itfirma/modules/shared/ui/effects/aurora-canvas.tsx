"use client";

import { useEffect, useRef } from "react";

import { toUnit } from "../color";
import { useSkinColors } from "../use-skin-colors";

import { useCanvasScene } from "./use-canvas-scene";

const VERTEX = `attribute vec2 aPosition;void main(){gl_Position=vec4(aPosition,0.0,1.0);}`;

// Value-noise bands drifting across the top of the box, painted with the skin's chart colours.
const FRAGMENT = `
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
uniform float uStrength;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.0-2.0*f);
  float a=hash(i),b=hash(i+vec2(1.0,0.0)),c=hash(i+vec2(0.0,1.0)),d=hash(i+vec2(1.0,1.0));
  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
float fbm(vec2 p){float v=0.0;float a=0.5;for(int i=0;i<4;i++){v+=a*noise(p);p*=2.03;a*=0.5;}return v;}
void main(){
  vec2 uv=gl_FragCoord.xy/uResolution.xy;
  float t=uTime*0.07;
  float ridge=fbm(vec2(uv.x*1.8+t,t*0.5));
  float height=0.42+0.3*(ridge-0.5);
  float band=exp(-abs(uv.y-height)*5.5);
  float detail=fbm(vec2(uv.x*5.0-t*1.8,uv.y*2.5+t*0.8));
  float glow=band*(0.45+0.55*detail);
  float hue=fbm(vec2(uv.x*1.3+t*0.4,0.37));
  vec3 col=mix(uColorA,uColorB,smoothstep(0.25,0.75,hue));
  col=mix(col,uColorC,smoothstep(0.45,1.0,detail)*0.55);
  float alpha=clamp(glow*uStrength,0.0,1.0);
  gl_FragColor=vec4(col*alpha,alpha);
}`;

interface Program {
    gl: WebGLRenderingContext;
    program: WebGLProgram;
    resolution: WebGLUniformLocation | null;
    time: WebGLUniformLocation | null;
    colors: [WebGLUniformLocation | null, WebGLUniformLocation | null, WebGLUniformLocation | null];
    strength: WebGLUniformLocation | null;
}

const compile = (gl: WebGLRenderingContext, type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
};

const setup = (canvas: HTMLCanvasElement): Program | null => {
    const gl = canvas.getContext("webgl", {
        premultipliedAlpha: true,
        alpha: true,
        antialias: false,
    });
    if (!gl) return null;
    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    const program = gl.createProgram();
    if (!vertex || !fragment || !program) return null;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    return {
        gl,
        program,
        resolution: gl.getUniformLocation(program, "uResolution"),
        time: gl.getUniformLocation(program, "uTime"),
        colors: [
            gl.getUniformLocation(program, "uColorA"),
            gl.getUniformLocation(program, "uColorB"),
            gl.getUniformLocation(program, "uColorC"),
        ],
        strength: gl.getUniformLocation(program, "uStrength"),
    };
};

interface AuroraCanvasProps {
    className?: string;
    /** 0..1, how much the light shows over the page background. */
    strength?: number;
}

/** Aurora of the skin's colours: a full-box WebGL quad; nothing is drawn where WebGL is missing. */
export const AuroraCanvas = ({ className, strength = 0.75 }: AuroraCanvasProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const programRef = useRef<Program | null>(null);
    const colors = useSkinColors();
    const colorsRef = useRef(colors);
    useEffect(() => {
        colorsRef.current = colors;
    }, [colors]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        programRef.current = setup(canvas);
        return () => {
            programRef.current?.gl.getExtension("WEBGL_lose_context")?.loseContext();
            programRef.current = null;
        };
    }, []);

    useCanvasScene(canvasRef, {
        maxDpr: 1.5,
        render: (time, _dt, size) => {
            const scene = programRef.current;
            if (!scene) return;
            const { gl } = scene;
            const [a, b, c] = colorsRef.current.chart;
            gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.uniform2f(scene.resolution, size.width * size.dpr, size.height * size.dpr);
            gl.uniform1f(scene.time, time);
            gl.uniform3f(scene.colors[0], ...toUnit(a));
            gl.uniform3f(scene.colors[1], ...toUnit(b));
            gl.uniform3f(scene.colors[2], ...toUnit(c));
            gl.uniform1f(scene.strength, strength);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        },
    });

    return (
        <canvas
            ref={canvasRef}
            aria-hidden
            className={["pointer-events-none absolute inset-0 h-full w-full", className]
                .filter(Boolean)
                .join(" ")}
        />
    );
};
