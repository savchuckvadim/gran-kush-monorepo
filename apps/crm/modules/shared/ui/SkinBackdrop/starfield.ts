export interface Starfield {
    /** Short hyperspace jump, used on route change. */
    warp: () => void;
    destroy: () => void;
}

interface Star {
    x: number;
    y: number;
    z: number;
    twinkle: number;
}

const STAR_COUNT = 260;
const WARP_MS = 650;
const CRUISE_SPEED = 0.0007;
const WARP_SPEED = 0.035;
const FALLBACK_COLOR = "230 236 255";

const createStar = (z = Math.random()): Star => ({
    x: Math.random() * 2 - 1,
    y: Math.random() * 2 - 1,
    z,
    twinkle: Math.random() * Math.PI * 2,
});

/** Stars fly towards the viewer; colour comes from the skin's `--star` token (an RGB triple). */
export const createStarfield = (
    canvas: HTMLCanvasElement,
    { reducedMotion }: { reducedMotion: boolean }
): Starfield => {
    const context = canvas.getContext("2d");
    if (!context) {
        return { warp: () => {}, destroy: () => {} };
    }

    const root = document.documentElement;
    const stars = Array.from({ length: STAR_COUNT }, () => createStar());
    let width = 0;
    let height = 0;
    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;
    let warpUntil = 0;

    const readColor = () =>
        getComputedStyle(root).getPropertyValue("--star").trim() || FALLBACK_COLOR;
    let color = readColor();

    const resize = () => {
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        width = canvas.clientWidth || window.innerWidth;
        height = canvas.clientHeight || window.innerHeight;
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const project = (star: Star, z: number): [number, number] => {
        const scale = 0.35 / z;
        return [
            width / 2 + star.x * scale * width * 0.6 + pointerX * (1 - z) * 40,
            height / 2 + star.y * scale * height * 0.6 + pointerY * (1 - z) * 40,
        ];
    };

    const draw = (time: number) => {
        const warping = time < warpUntil;
        const speed = warping ? WARP_SPEED : CRUISE_SPEED;
        context.clearRect(0, 0, width, height);

        for (let i = 0; i < stars.length; i++) {
            let star = stars[i];
            if (!star) continue;
            if (!reducedMotion) star.z -= speed;
            if (star.z <= 0.04) {
                star = createStar(1);
                stars[i] = star;
            }

            const [x, y] = project(star, star.z);
            if (x < -10 || x > width + 10 || y < -10 || y > height + 10) {
                stars[i] = createStar(1);
                continue;
            }

            const depth = 1 - star.z;
            if (warping) {
                const [tailX, tailY] = project(star, Math.min(1, star.z + 0.12));
                context.strokeStyle = `rgb(${color} / ${Math.min(1, depth * 1.6)})`;
                context.lineWidth = 0.6 + depth * 1.8;
                context.beginPath();
                context.moveTo(tailX, tailY);
                context.lineTo(x, y);
                context.stroke();
            } else {
                const alpha =
                    Math.min(1, depth * 1.3) * (0.65 + 0.35 * Math.sin(time / 700 + star.twinkle));
                context.fillStyle = `rgb(${color} / ${alpha})`;
                context.beginPath();
                context.arc(x, y, 0.3 + depth * 1.5, 0, Math.PI * 2);
                context.fill();
            }
        }
    };

    const loop = (time: number) => {
        draw(time);
        frame = window.requestAnimationFrame(loop);
    };

    const handleResize = () => {
        resize();
        if (reducedMotion) draw(0);
    };

    const handlePointer = (event: PointerEvent) => {
        pointerX = (event.clientX / window.innerWidth - 0.5) * 2;
        pointerY = (event.clientY / window.innerHeight - 0.5) * 2;
    };

    // light/dark side swaps --star on <html>
    const observer = new MutationObserver(() => {
        color = readColor();
        if (reducedMotion) draw(0);
    });

    resize();
    observer.observe(root, { attributes: true, attributeFilter: ["class", "data-skin"] });
    window.addEventListener("resize", handleResize);
    if (reducedMotion) {
        draw(0);
    } else {
        window.addEventListener("pointermove", handlePointer, { passive: true });
        frame = window.requestAnimationFrame(loop);
    }

    return {
        warp: () => {
            if (!reducedMotion) warpUntil = performance.now() + WARP_MS;
        },
        destroy: () => {
            window.cancelAnimationFrame(frame);
            observer.disconnect();
            window.removeEventListener("resize", handleResize);
            window.removeEventListener("pointermove", handlePointer);
            context.clearRect(0, 0, width, height);
        },
    };
};
