/* Smoke that follows the cursor: a compact stable-fluids simulation (advection, vorticity,
   pressure projection) in WebGL, after the approach of Pavel Dobryakov's WebGL Fluid
   Simulation (MIT). Returns null when WebGL or half-float render targets are missing,
   so the hero simply shows the video. */
(function () {
    "use strict";

    function createFluid(canvas, options) {
        var opts = Object.assign(
            {
                simResolution: 128,
                dyeResolution: 768,
                densityDissipation: 0.9,
                velocityDissipation: 0.25,
                pressure: 0.8,
                pressureIterations: 18,
                curl: 22,
                splatRadius: 0.22,
                splatForce: 5200,
                intensity: 0.16,
                invert: false,
                colors: [[1, 0.36, 0.1]],
            },
            options || {},
        );

        var params = { alpha: false, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false };
        var gl = canvas.getContext("webgl2", params);
        var isWebGL2 = !!gl;
        if (!gl) gl = canvas.getContext("webgl", params) || canvas.getContext("experimental-webgl", params);
        if (!gl) return null;

        var halfFloat, supportLinear;
        if (isWebGL2) {
            gl.getExtension("EXT_color_buffer_float");
            supportLinear = gl.getExtension("OES_texture_float_linear");
        } else {
            halfFloat = gl.getExtension("OES_texture_half_float");
            supportLinear = gl.getExtension("OES_texture_half_float_linear");
        }
        var texType = isWebGL2 ? gl.HALF_FLOAT : halfFloat && halfFloat.HALF_FLOAT_OES;
        if (!texType) return null;

        function supportsFormat(internalFormat, format, type) {
            var tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);
            var fbo = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
            var ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
            gl.deleteFramebuffer(fbo);
            gl.deleteTexture(tex);
            return ok;
        }

        function pickFormat(internalFormat, format) {
            if (supportsFormat(internalFormat, format, texType)) return { internal: internalFormat, format: format };
            if (!isWebGL2) return null;
            if (internalFormat === gl.R16F) return pickFormat(gl.RG16F, gl.RG);
            if (internalFormat === gl.RG16F) return pickFormat(gl.RGBA16F, gl.RGBA);
            return null;
        }

        var fRGBA, fRG, fR;
        if (isWebGL2) {
            fRGBA = pickFormat(gl.RGBA16F, gl.RGBA);
            fRG = pickFormat(gl.RG16F, gl.RG);
            fR = pickFormat(gl.R16F, gl.RED);
        } else {
            fRGBA = fRG = fR = pickFormat(gl.RGBA, gl.RGBA);
        }
        if (!fRGBA || !fRG || !fR) return null;

        var baseVS = [
            "precision highp float;",
            "attribute vec2 aPosition;",
            "varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;",
            "uniform vec2 texelSize;",
            "void main(){",
            "  vUv = aPosition * 0.5 + 0.5;",
            "  vL = vUv - vec2(texelSize.x, 0.0); vR = vUv + vec2(texelSize.x, 0.0);",
            "  vT = vUv + vec2(0.0, texelSize.y); vB = vUv - vec2(0.0, texelSize.y);",
            "  gl_Position = vec4(aPosition, 0.0, 1.0);",
            "}",
        ].join("\n");

        var FS = {
            splat: [
                "precision highp float;",
                "varying vec2 vUv; uniform sampler2D uTarget; uniform float aspectRatio; uniform vec3 color; uniform vec2 point; uniform float radius;",
                "void main(){ vec2 p = vUv - point; p.x *= aspectRatio; vec3 s = exp(-dot(p, p) / radius) * color; gl_FragColor = vec4(texture2D(uTarget, vUv).xyz + s, 1.0); }",
            ].join("\n"),
            advection: [
                "precision highp float;",
                "varying vec2 vUv; uniform sampler2D uVelocity; uniform sampler2D uSource; uniform vec2 texelSize; uniform vec2 dyeTexelSize; uniform float dt; uniform float dissipation;",
                "vec4 bilerp(sampler2D sam, vec2 uv, vec2 ts){ vec2 st = uv / ts - 0.5; vec2 i = floor(st); vec2 f = fract(st);",
                "  vec4 a = texture2D(sam, (i + vec2(0.5, 0.5)) * ts); vec4 b = texture2D(sam, (i + vec2(1.5, 0.5)) * ts);",
                "  vec4 c = texture2D(sam, (i + vec2(0.5, 1.5)) * ts); vec4 d = texture2D(sam, (i + vec2(1.5, 1.5)) * ts);",
                "  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y); }",
                "void main(){",
                "#ifdef MANUAL_FILTERING",
                "  vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize; vec4 r = bilerp(uSource, coord, dyeTexelSize);",
                "#else",
                "  vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize; vec4 r = texture2D(uSource, coord);",
                "#endif",
                "  gl_FragColor = r / (1.0 + dissipation * dt); }",
            ].join("\n"),
            divergence: [
                "precision mediump float;",
                "varying highp vec2 vUv; varying highp vec2 vL; varying highp vec2 vR; varying highp vec2 vT; varying highp vec2 vB; uniform sampler2D uVelocity;",
                "void main(){ float L = texture2D(uVelocity, vL).x; float R = texture2D(uVelocity, vR).x; float T = texture2D(uVelocity, vT).y; float B = texture2D(uVelocity, vB).y;",
                "  vec2 C = texture2D(uVelocity, vUv).xy; if (vL.x < 0.0) L = -C.x; if (vR.x > 1.0) R = -C.x; if (vT.y > 1.0) T = -C.y; if (vB.y < 0.0) B = -C.y;",
                "  gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0); }",
            ].join("\n"),
            curl: [
                "precision mediump float;",
                "varying highp vec2 vUv; varying highp vec2 vL; varying highp vec2 vR; varying highp vec2 vT; varying highp vec2 vB; uniform sampler2D uVelocity;",
                "void main(){ float L = texture2D(uVelocity, vL).y; float R = texture2D(uVelocity, vR).y; float T = texture2D(uVelocity, vT).x; float B = texture2D(uVelocity, vB).x;",
                "  gl_FragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0); }",
            ].join("\n"),
            vorticity: [
                "precision highp float;",
                "varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB; uniform sampler2D uVelocity; uniform sampler2D uCurl; uniform float curl; uniform float dt;",
                "void main(){ float L = texture2D(uCurl, vL).x; float R = texture2D(uCurl, vR).x; float T = texture2D(uCurl, vT).x; float B = texture2D(uCurl, vB).x; float C = texture2D(uCurl, vUv).x;",
                "  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L)); force /= length(force) + 0.0001; force *= curl * C; force.y *= -1.0;",
                "  vec2 v = texture2D(uVelocity, vUv).xy + force * dt; v = min(max(v, -1000.0), 1000.0); gl_FragColor = vec4(v, 0.0, 1.0); }",
            ].join("\n"),
            pressure: [
                "precision mediump float;",
                "varying highp vec2 vUv; varying highp vec2 vL; varying highp vec2 vR; varying highp vec2 vT; varying highp vec2 vB; uniform sampler2D uPressure; uniform sampler2D uDivergence;",
                "void main(){ float L = texture2D(uPressure, vL).x; float R = texture2D(uPressure, vR).x; float T = texture2D(uPressure, vT).x; float B = texture2D(uPressure, vB).x;",
                "  float d = texture2D(uDivergence, vUv).x; gl_FragColor = vec4((L + R + B + T - d) * 0.25, 0.0, 0.0, 1.0); }",
            ].join("\n"),
            gradient: [
                "precision mediump float;",
                "varying highp vec2 vUv; varying highp vec2 vL; varying highp vec2 vR; varying highp vec2 vT; varying highp vec2 vB; uniform sampler2D uPressure; uniform sampler2D uVelocity;",
                "void main(){ float L = texture2D(uPressure, vL).x; float R = texture2D(uPressure, vR).x; float T = texture2D(uPressure, vT).x; float B = texture2D(uPressure, vB).x;",
                "  vec2 v = texture2D(uVelocity, vUv).xy - vec2(R - L, T - B); gl_FragColor = vec4(v, 0.0, 1.0); }",
            ].join("\n"),
            clear: [
                "precision mediump float;",
                "varying highp vec2 vUv; uniform sampler2D uTexture; uniform float value;",
                "void main(){ gl_FragColor = value * texture2D(uTexture, vUv); }",
            ].join("\n"),
            display: [
                "precision highp float;",
                "varying vec2 vUv; uniform sampler2D uTexture; uniform float invert;",
                "void main(){ vec3 c = texture2D(uTexture, vUv).rgb; c = c / (1.0 + c * 0.35);",
                "  gl_FragColor = vec4(mix(c, vec3(1.0) - c, invert), 1.0); }",
            ].join("\n"),
        };

        function compile(type, source, keywords) {
            if (keywords) source = keywords.map(function (k) { return "#define " + k + "\n"; }).join("") + source;
            var shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
            return shader;
        }

        var vertex = compile(gl.VERTEX_SHADER, baseVS);

        function program(fragmentSource, keywords) {
            var p = gl.createProgram();
            gl.attachShader(p, vertex);
            gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fragmentSource, keywords));
            gl.bindAttribLocation(p, 0, "aPosition");
            gl.linkProgram(p);
            if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
            var u = {};
            var n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
            for (var i = 0; i < n; i++) {
                var name = gl.getActiveUniform(p, i).name;
                u[name] = gl.getUniformLocation(p, name);
            }
            return { p: p, u: u, use: function () { gl.useProgram(p); } };
        }

        var P = {
            splat: program(FS.splat),
            advection: program(FS.advection, supportLinear ? null : ["MANUAL_FILTERING"]),
            divergence: program(FS.divergence),
            curl: program(FS.curl),
            vorticity: program(FS.vorticity),
            pressure: program(FS.pressure),
            gradient: program(FS.gradient),
            clear: program(FS.clear),
            display: program(FS.display),
        };

        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(0);

        function blit(target) {
            if (target) {
                gl.viewport(0, 0, target.w, target.h);
                gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
            } else {
                gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            }
            gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
        }

        function fbo(w, h, f, filter) {
            gl.activeTexture(gl.TEXTURE0);
            var tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, f.internal, w, h, 0, f.format, texType, null);
            var fb = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
            gl.viewport(0, 0, w, h);
            gl.clear(gl.COLOR_BUFFER_BIT);
            return {
                tex: tex,
                fbo: fb,
                w: w,
                h: h,
                tx: 1 / w,
                ty: 1 / h,
                attach: function (id) {
                    gl.activeTexture(gl.TEXTURE0 + id);
                    gl.bindTexture(gl.TEXTURE_2D, tex);
                    return id;
                },
            };
        }

        function doubleFbo(w, h, f, filter) {
            var a = fbo(w, h, f, filter);
            var b = fbo(w, h, f, filter);
            return {
                get read() { return a; },
                get write() { return b; },
                swap: function () { var t = a; a = b; b = t; },
                w: w,
                h: h,
                tx: 1 / w,
                ty: 1 / h,
            };
        }

        function res(resolution) {
            var aspect = gl.drawingBufferWidth / gl.drawingBufferHeight;
            if (aspect < 1) aspect = 1 / aspect;
            var min = Math.round(resolution);
            var max = Math.round(resolution * aspect);
            return gl.drawingBufferWidth > gl.drawingBufferHeight ? { w: max, h: min } : { w: min, h: max };
        }

        var dye, velocity, divergence, curlT, pressureT;
        var linear = supportLinear ? gl.LINEAR : gl.NEAREST;

        function initTargets() {
            var sim = res(opts.simResolution);
            var dyeR = res(opts.dyeResolution);
            dye = doubleFbo(dyeR.w, dyeR.h, fRGBA, linear);
            velocity = doubleFbo(sim.w, sim.h, fRG, linear);
            divergence = fbo(sim.w, sim.h, fR, gl.NEAREST);
            curlT = fbo(sim.w, sim.h, fR, gl.NEAREST);
            pressureT = doubleFbo(sim.w, sim.h, fR, gl.NEAREST);
        }

        function resize() {
            var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            var w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
            var h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w;
                canvas.height = h;
                initTargets();
            }
        }

        function radius() {
            var aspect = canvas.width / canvas.height;
            var r = opts.splatRadius / 100;
            return aspect > 1 ? r * aspect : r;
        }

        function splat(x, y, dx, dy, color) {
            P.splat.use();
            gl.uniform1i(P.splat.u.uTarget, velocity.read.attach(0));
            gl.uniform1f(P.splat.u.aspectRatio, canvas.width / canvas.height);
            gl.uniform2f(P.splat.u.point, x, y);
            gl.uniform3f(P.splat.u.color, dx, dy, 0);
            gl.uniform1f(P.splat.u.radius, radius());
            blit(velocity.write);
            velocity.swap();
            gl.uniform1i(P.splat.u.uTarget, dye.read.attach(0));
            gl.uniform3f(P.splat.u.color, color[0], color[1], color[2]);
            blit(dye.write);
            dye.swap();
        }

        function step(dt) {
            gl.disable(gl.BLEND);
            P.curl.use();
            gl.uniform2f(P.curl.u.texelSize, velocity.tx, velocity.ty);
            gl.uniform1i(P.curl.u.uVelocity, velocity.read.attach(0));
            blit(curlT);

            P.vorticity.use();
            gl.uniform2f(P.vorticity.u.texelSize, velocity.tx, velocity.ty);
            gl.uniform1i(P.vorticity.u.uVelocity, velocity.read.attach(0));
            gl.uniform1i(P.vorticity.u.uCurl, curlT.attach(1));
            gl.uniform1f(P.vorticity.u.curl, opts.curl);
            gl.uniform1f(P.vorticity.u.dt, dt);
            blit(velocity.write);
            velocity.swap();

            P.divergence.use();
            gl.uniform2f(P.divergence.u.texelSize, velocity.tx, velocity.ty);
            gl.uniform1i(P.divergence.u.uVelocity, velocity.read.attach(0));
            blit(divergence);

            P.clear.use();
            gl.uniform1i(P.clear.u.uTexture, pressureT.read.attach(0));
            gl.uniform1f(P.clear.u.value, opts.pressure);
            blit(pressureT.write);
            pressureT.swap();

            P.pressure.use();
            gl.uniform2f(P.pressure.u.texelSize, velocity.tx, velocity.ty);
            gl.uniform1i(P.pressure.u.uDivergence, divergence.attach(0));
            for (var i = 0; i < opts.pressureIterations; i++) {
                gl.uniform1i(P.pressure.u.uPressure, pressureT.read.attach(1));
                blit(pressureT.write);
                pressureT.swap();
            }

            P.gradient.use();
            gl.uniform2f(P.gradient.u.texelSize, velocity.tx, velocity.ty);
            gl.uniform1i(P.gradient.u.uPressure, pressureT.read.attach(0));
            gl.uniform1i(P.gradient.u.uVelocity, velocity.read.attach(1));
            blit(velocity.write);
            velocity.swap();

            P.advection.use();
            gl.uniform2f(P.advection.u.texelSize, velocity.tx, velocity.ty);
            if (!supportLinear) gl.uniform2f(P.advection.u.dyeTexelSize, velocity.tx, velocity.ty);
            var vid = velocity.read.attach(0);
            gl.uniform1i(P.advection.u.uVelocity, vid);
            gl.uniform1i(P.advection.u.uSource, vid);
            gl.uniform1f(P.advection.u.dt, dt);
            gl.uniform1f(P.advection.u.dissipation, opts.velocityDissipation);
            blit(velocity.write);
            velocity.swap();

            if (!supportLinear) gl.uniform2f(P.advection.u.dyeTexelSize, dye.tx, dye.ty);
            gl.uniform1i(P.advection.u.uVelocity, velocity.read.attach(0));
            gl.uniform1i(P.advection.u.uSource, dye.read.attach(1));
            gl.uniform1f(P.advection.u.dissipation, opts.densityDissipation);
            blit(dye.write);
            dye.swap();
        }

        function render() {
            P.display.use();
            gl.uniform1i(P.display.u.uTexture, dye.read.attach(0));
            gl.uniform1f(P.display.u.invert, opts.invert ? 1 : 0);
            blit(null);
        }

        function pickColor() {
            var c = opts.colors[Math.floor(Math.random() * opts.colors.length)];
            return [c[0] * opts.intensity, c[1] * opts.intensity, c[2] * opts.intensity];
        }

        var pointer = { x: 0.5, y: 0.5, px: 0.5, py: 0.5, moved: false, color: pickColor() };
        var running = false;
        var last = performance.now();
        var raf = 0;
        var colorTimer = 0;

        function loop(now) {
            if (!running) return;
            var dt = Math.min((now - last) / 1000, 0.016666);
            last = now;
            resize();
            colorTimer += dt;
            if (colorTimer > 1.4) {
                colorTimer = 0;
                pointer.color = pickColor();
            }
            if (pointer.moved) {
                pointer.moved = false;
                var dx = (pointer.x - pointer.px) * opts.splatForce;
                var dy = (pointer.y - pointer.py) * opts.splatForce;
                splat(pointer.x, pointer.y, dx, dy, pointer.color);
            }
            step(dt);
            render();
            raf = requestAnimationFrame(loop);
        }

        resize();

        return {
            move: function (clientX, clientY) {
                var rect = canvas.getBoundingClientRect();
                var x = (clientX - rect.left) / rect.width;
                var y = 1 - (clientY - rect.top) / rect.height;
                if (!pointer.started) {
                    pointer.px = x;
                    pointer.py = y;
                    pointer.started = true;
                } else {
                    pointer.px = pointer.x;
                    pointer.py = pointer.y;
                }
                pointer.x = x;
                pointer.y = y;
                pointer.moved = Math.abs(pointer.x - pointer.px) + Math.abs(pointer.y - pointer.py) > 0;
            },
            puff: function (count) {
                for (var i = 0; i < (count || 6); i++) {
                    var c = pickColor();
                    splat(Math.random(), Math.random() * 0.6, 900 * (Math.random() - 0.5), 1200 * Math.random(), [c[0] * 6, c[1] * 6, c[2] * 6]);
                }
            },
            burst: function (clientX, clientY, count) {
                var rect = canvas.getBoundingClientRect();
                var x = (clientX - rect.left) / rect.width;
                var y = 1 - (clientY - rect.top) / rect.height;
                var n = count || 10;
                for (var i = 0; i < n; i++) {
                    var a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
                    var c = pickColor();
                    var f = 900 + Math.random() * 900;
                    splat(x, y, Math.cos(a) * f, Math.sin(a) * f, [c[0] * 3.2, c[1] * 3.2, c[2] * 3.2]);
                }
            },
            rise: function (count) {
                for (var i = 0; i < (count || 1); i++) {
                    var c = pickColor();
                    splat(Math.random(), 0.01, 260 * (Math.random() - 0.5), 380 + Math.random() * 520, [c[0] * 2.2, c[1] * 2.2, c[2] * 2.2]);
                }
            },
            setOptions: function (next) {
                Object.assign(opts, next);
                pointer.color = pickColor();
            },
            start: function () {
                if (running) return;
                running = true;
                last = performance.now();
                raf = requestAnimationFrame(loop);
            },
            stop: function () {
                running = false;
                cancelAnimationFrame(raf);
            },
        };
    }

    window.createFluid = createFluid;
})();
