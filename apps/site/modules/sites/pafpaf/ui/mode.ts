export type Mode = "dark" | "light";

export const MODE_KEY = "pafpaf.mode";
export const MODE_EVENT = "pafpaf:mode";
export const BURST_EVENT = "pafpaf:burst";

// Runs before paint so a saved light mode never flashes dark.
export const MODE_SCRIPT = `(function(){try{var m=localStorage.getItem("${MODE_KEY}");if(m==="light"||m==="dark")document.documentElement.setAttribute("data-mode",m)}catch(e){}})();`;

export const readMode = (): Mode =>
    document.documentElement.getAttribute("data-mode") === "light" ? "light" : "dark";

export const subscribeMode = (callback: () => void) => {
    window.addEventListener(MODE_EVENT, callback);
    return () => window.removeEventListener(MODE_EVENT, callback);
};

export const SMOKE_KEY = "pafpaf.smoke";
export const SMOKE_EVENT = "pafpaf:smoke";

export const isSmokeOff = () => document.documentElement.getAttribute("data-smoke") === "off";

export const subscribeSmoke = (callback: () => void) => {
    window.addEventListener(SMOKE_EVENT, callback);
    return () => window.removeEventListener(SMOKE_EVENT, callback);
};

export const setSmokeOff = (off: boolean) => {
    if (off) document.documentElement.setAttribute("data-smoke", "off");
    else document.documentElement.removeAttribute("data-smoke");
    window.dispatchEvent(new Event(SMOKE_EVENT));
};

export interface BurstDetail {
    x: number;
    y: number;
}
