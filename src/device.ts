/** Mobile / iOS / low-GPU detection for Sterling City launch. */

function readLiteGpu(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has("lite") || params.has("nossao")) return true;
    if (params.has("fullgpu")) return false;
    const ua = navigator.userAgent || "";
    const iOS =
      /iP(hone|ad|od)/i.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const coarse = window.matchMedia?.("(pointer: coarse)")?.matches === true;
    const touch = navigator.maxTouchPoints > 0 || coarse;
    const narrow = Math.min(window.innerWidth, window.innerHeight) < 820;
    const saveData = Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
    return iOS || saveData || reduced || (touch && narrow);
  } catch {
    return false;
  }
}

export const isLiteGpu = readLiteGpu();

declare global {
  interface Window {
    __SC_LITE?: boolean;
  }
}

window.__SC_LITE = isLiteGpu;
document.documentElement.classList.toggle("lite-gpu", isLiteGpu);
if (document.body) document.body.classList.toggle("lite-gpu", isLiteGpu);
else document.addEventListener("DOMContentLoaded", () => document.body.classList.toggle("lite-gpu", isLiteGpu));
