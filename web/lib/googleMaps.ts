// Loads the Google Maps JS API once and resolves with `window.google`.
// The key is the same public client key the mobile apps ship (app.json);
// override via NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in the environment.
const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyD-xBIuVKRb8K1AI0EjP8mq-vTQkwHyqKA';

let promise: Promise<any> | null = null;

export function loadGoogleMaps(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  const w = window as any;
  if (w.google?.maps) return Promise.resolve(w.google);
  if (promise) return promise;

  promise = new Promise((resolve, reject) => {
    const cbName = '__stayonGmapsReady';
    w[cbName] = () => resolve(w.google);
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${KEY}&callback=${cbName}&loading=async`;
    s.async = true;
    s.defer = true;
    s.onerror = () => reject(new Error('Google Maps failed to load'));
    document.head.appendChild(s);
  });
  return promise;
}

export { KEY as GOOGLE_MAPS_KEY };

// A teardrop location pin painted with the app's STAYON_GRADIENT
// (#0D9488 → #6366F1). Native Google markers/symbols can't render a gradient,
// so we hand them an inline SVG. Works for draggable markers too.
const PIN_SVG =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="#0d9488"/><stop offset="1" stop-color="#6366f1"/>` +
      `</linearGradient></defs>` +
      `<path d="M16 41C16 41 28 25 28 15A12 12 0 1 0 4 15C4 25 16 41 16 41Z" fill="url(#g)" stroke="#fff" stroke-width="2"/>` +
      `<circle cx="16" cy="15" r="4.6" fill="#fff"/>` +
    `</svg>`,
  );

/** Gradient teardrop marker icon config for `new google.maps.Marker({ icon })`. */
export function gradientPinIcon(google: any) {
  return {
    url: PIN_SVG,
    scaledSize: new google.maps.Size(32, 42),
    anchor: new google.maps.Point(16, 41),
  };
}
