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
