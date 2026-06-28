// Web boot loader — a "StayOn Host" loader shown before React paints, styled to
// match the splash (dark backdrop, lavender italic wordmark with a purple glow)
// so the hand-off is seamless. Pure DOM/CSS; removed via hideBootLoader().

const LOADER_ID = 'stayon-host-boot-loader';
const RESET_ID = 'stayon-host-responsive-reset';
const doc: any = (globalThis as any).document;

// Constrain the web app to the viewport so it fits any mobile screen and never
// overflows horizontally (otherwise content can render wider than the device and
// get clipped). Persists for the app's lifetime (not removed with the loader).
function injectResponsiveReset() {
  if (!doc) return;

  // 1) Ensure a correct viewport meta — without this the mobile browser renders
  //    at a ~980px layout width and only shows a clipped slice of the page.
  try {
    let vp = doc.querySelector('meta[name="viewport"]');
    if (!vp) {
      vp = doc.createElement('meta');
      vp.setAttribute('name', 'viewport');
      (doc.head || doc.documentElement).appendChild(vp);
    }
    vp.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover');
  } catch {}

  // 2) Pin the app shell to the visual viewport so nothing overflows on any size.
  if (doc.getElementById(RESET_ID)) return;
  const style = doc.createElement('style');
  style.id = RESET_ID;
  style.textContent = `
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; max-width: 100%; overflow-x: hidden; }
    #root, #main, body > div:first-child { width: 100%; max-width: 100%; min-height: 100%; overflow-x: hidden; box-sizing: border-box; }
  `;
  const mount = () => doc.head && doc.head.appendChild(style);
  if (doc.head) mount(); else doc.addEventListener('DOMContentLoaded', mount);
}

function injectBootLoader() {
  if (!doc) return;
  injectResponsiveReset();
  if (doc.getElementById(LOADER_ID)) return;

  const style = doc.createElement('style');
  style.textContent = `
    @keyframes sh-slide { 0% { transform: translateX(-100%); } 100% { transform: translateX(250%); } }
    @keyframes sh-pulse { 0%,100% { opacity: .6 } 50% { opacity: 1 } }
    @keyframes sh-rise { 0% { opacity: 0; transform: translateY(8px); } 100% { opacity: 1; transform: translateY(0); } }
    #${LOADER_ID} {
      position: fixed; inset: 0; z-index: 99999;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px;
      background: linear-gradient(135deg, #0D9488 0%, #6366F1 100%);
      font-family: Georgia, "Times New Roman", serif;
      transition: opacity .45s ease;
    }
    #${LOADER_ID} .sh-brand {
      color: #E9D5FF; font-size: 44px; font-style: italic; font-weight: 300; letter-spacing: 2px;
      text-shadow: 0 0 45px #A855F7; animation: sh-rise .6s ease both;
    }
    #${LOADER_ID} .sh-host {
      display: flex; align-items: center; gap: 12px; color: #E9D5FF;
    }
    #${LOADER_ID} .sh-host .rule { width: 28px; height: 1px; background: rgba(233,213,255,.5); }
    #${LOADER_ID} .sh-host .label { font-family: -apple-system, system-ui, sans-serif; font-size: 13px; letter-spacing: 8px; text-shadow: 0 0 20px #A855F7; }
    #${LOADER_ID} .sh-bar { position: relative; width: 168px; height: 4px; border-radius: 99px; background: rgba(233,213,255,.18); overflow: hidden; }
    #${LOADER_ID} .sh-bar > i { position: absolute; top: 0; bottom: 0; left: 0; width: 40%; border-radius: 99px;
      background: linear-gradient(90deg, rgba(233,213,255,0), #E9D5FF 50%, rgba(233,213,255,0)); animation: sh-slide 1.15s cubic-bezier(.65,.05,.36,1) infinite; }
    #${LOADER_ID} .sh-sub { font-family: -apple-system, system-ui, sans-serif; color: rgba(233,213,255,.85); font-size: 12px; letter-spacing: 2px; text-transform: uppercase; animation: sh-pulse 1.4s ease-in-out infinite; }
  `;

  const overlay = doc.createElement('div');
  overlay.id = LOADER_ID;
  overlay.innerHTML =
    '<div class="sh-brand">Stay On</div>' +
    '<div class="sh-host"><span class="rule"></span><span class="label">HOST</span><span class="rule"></span></div>' +
    '<div class="sh-bar"><i></i></div>' +
    '<div class="sh-sub">Loading…</div>';

  const mount = () => { doc.head.appendChild(style); doc.body.appendChild(overlay); };
  if (doc.body) mount();
  else doc.addEventListener('DOMContentLoaded', mount);
}

export function hideBootLoader() {
  if (!doc) return;
  const el = doc.getElementById(LOADER_ID);
  if (!el) return;
  el.style.opacity = '0';
  setTimeout(() => el.parentNode && el.parentNode.removeChild(el), 480);
}

injectBootLoader();
