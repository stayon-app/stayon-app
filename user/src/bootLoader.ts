// Web boot loader — a branded spinner shown the instant the app script runs,
// covering the gap before React mounts and paints (RN-web first render is heavy).
// Pure DOM/CSS so it needs no React. Removed via hideBootLoader() once mounted.
// No-op on native (there's an animated SplashScreen there).

const LOADER_ID = 'stayon-boot-loader';

// Access the DOM via globalThis so this compiles without the TS "dom" lib
// (the project's tsconfig targets React Native, not the browser).
const doc: any = (globalThis as any).document;

function injectBootLoader() {
  if (!doc) return; // native / SSR — skip
  if (doc.getElementById(LOADER_ID)) return;

  const style = doc.createElement('style');
  style.textContent = `
    @keyframes stayon-slide {
      0%   { transform: translateX(-100%); }
      100% { transform: translateX(250%); }
    }
    @keyframes stayon-pulse { 0%,100% { opacity: .6 } 50% { opacity: 1 } }
    @keyframes stayon-rise {
      0% { opacity: 0; transform: translateY(8px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    #${LOADER_ID} {
      position: fixed; inset: 0; z-index: 99999;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 16px;
      background: linear-gradient(160deg, #0D9488 0%, #0F766E 55%, #4F46E5 140%);
      font-family: -apple-system, system-ui, "Segoe UI", Roboto, sans-serif;
      transition: opacity .45s ease;
    }
    #${LOADER_ID} .stayon-brand {
      color: #fff; font-size: 26px; font-weight: 800; letter-spacing: .3px;
      animation: stayon-rise .5s ease both;
    }
    /* Indeterminate progress bar — a highlight sweeps across a soft track. */
    #${LOADER_ID} .stayon-bar {
      position: relative; width: 168px; height: 5px; border-radius: 99px;
      background: rgba(255,255,255,0.22); overflow: hidden;
    }
    #${LOADER_ID} .stayon-bar > i {
      position: absolute; top: 0; bottom: 0; left: 0; width: 40%;
      border-radius: 99px;
      background: linear-gradient(90deg, rgba(255,255,255,0), #ffffff 50%, rgba(255,255,255,0));
      animation: stayon-slide 1.15s cubic-bezier(.65,.05,.36,1) infinite;
    }
    #${LOADER_ID} .stayon-sub {
      color: rgba(255,255,255,0.9); font-size: 12px; font-weight: 700;
      letter-spacing: 2px; text-transform: uppercase;
      animation: stayon-pulse 1.4s ease-in-out infinite;
    }
  `;

  const overlay = doc.createElement('div');
  overlay.id = LOADER_ID;
  overlay.innerHTML =
    '<div class="stayon-brand">StayOn</div>' +
    '<div class="stayon-bar"><i></i></div>' +
    '<div class="stayon-sub">Loading your stays…</div>';

  const mount = () => {
    doc.head.appendChild(style);
    doc.body.appendChild(overlay);
  };
  if (doc.body) mount();
  else doc.addEventListener('DOMContentLoaded', mount);
}

/** Fade out and remove the boot loader once the app has mounted. */
export function hideBootLoader() {
  if (!doc) return;
  const el = doc.getElementById(LOADER_ID);
  if (!el) return;
  el.style.opacity = '0';
  setTimeout(() => el.parentNode && el.parentNode.removeChild(el), 480);
}

// Inject immediately on import (side effect) — so this must be the FIRST import.
injectBootLoader();
