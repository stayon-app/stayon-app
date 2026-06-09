// Cross-platform trip actions: directions, calendar, weather.
// Works on web (Google Maps / Google Calendar / .ics download) and upgrades to
// the native experience (Apple Maps on iOS) automatically via platform checks.
import { Platform, Linking } from 'react-native';

export interface PlaceTarget {
  latitude?: number;
  longitude?: number;
  label: string; // human-readable destination (used when no coords)
}

/**
 * Open turn-by-turn directions FROM the user's current/live location TO the stay.
 * iOS  -> Apple Maps (maps.apple.com)   | web/Android -> Google Maps.
 * Omitting the source address makes both apps start from the device's current location.
 */
export function openDirections(target: PlaceTarget) {
  const hasCoords =
    typeof target.latitude === 'number' &&
    typeof target.longitude === 'number' &&
    !(target.latitude === 0 && target.longitude === 0);

  const dest = hasCoords
    ? `${target.latitude},${target.longitude}`
    : encodeURIComponent(target.label);

  let url: string;
  if (Platform.OS === 'ios') {
    // Apple Maps — daddr = destination, dirflg=d (driving). No saddr => current location.
    url = `http://maps.apple.com/?daddr=${dest}&dirflg=d`;
  } else {
    // Google Maps universal directions URL (web + Android).
    url = `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;
  }
  return Linking.openURL(url).catch(() => {});
}

/** Open the stay's location on a map (no directions). */
export function openMap(target: PlaceTarget) {
  const hasCoords =
    typeof target.latitude === 'number' &&
    typeof target.longitude === 'number' &&
    !(target.latitude === 0 && target.longitude === 0);
  const q = hasCoords ? `${target.latitude},${target.longitude}` : encodeURIComponent(target.label);
  const url =
    Platform.OS === 'ios'
      ? `http://maps.apple.com/?q=${q}`
      : `https://www.google.com/maps/search/?api=1&query=${q}`;
  return Linking.openURL(url).catch(() => {});
}

export interface CalendarEvent {
  title: string;
  details?: string;
  location?: string;
  start: Date;
  end: Date;
}

function fmtICSDate(d: Date): string {
  // YYYYMMDDTHHMMSSZ (UTC)
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/** Google Calendar "add event" template URL — works in any browser, web or mobile. */
export function googleCalendarUrl(ev: CalendarEvent): string {
  const dates = `${fmtICSDate(ev.start)}/${fmtICSDate(ev.end)}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates,
    details: ev.details ?? '',
    location: ev.location ?? '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Raw .ics content (opens in Apple Calendar / Reminders, Outlook, etc.). */
export function buildICS(ev: CalendarEvent): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//StayOn//Booking//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@stayon.app`,
    `DTSTAMP:${fmtICSDate(new Date())}`,
    `DTSTART:${fmtICSDate(ev.start)}`,
    `DTEND:${fmtICSDate(ev.end)}`,
    `SUMMARY:${ev.title}`,
    `DESCRIPTION:${(ev.details ?? '').replace(/\n/g, '\\n')}`,
    `LOCATION:${ev.location ?? ''}`,
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    'DESCRIPTION:Your StayOn check-in is tomorrow',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Add a check-in event/reminder to the user's calendar.
 * Web: downloads an .ics (Apple Calendar/Reminders, Google, Outlook all read it).
 * Native: opens the Google Calendar template URL via the browser.
 */
export function addToCalendar(ev: CalendarEvent) {
  if (Platform.OS === 'web') {
    try {
      const ics = buildICS(ev);
      const g: any = globalThis as any;
      const blob = new g.Blob([ics], { type: 'text/calendar;charset=utf-8' });
      const href = g.URL.createObjectURL(blob);
      const a = g.document.createElement('a');
      a.href = href;
      a.download = `${ev.title.replace(/[^\w]+/g, '-')}.ics`;
      g.document.body.appendChild(a);
      a.click();
      g.document.body.removeChild(a);
      g.URL.revokeObjectURL(href);
      return Promise.resolve();
    } catch {
      return Linking.openURL(googleCalendarUrl(ev)).catch(() => {});
    }
  }
  return Linking.openURL(googleCalendarUrl(ev)).catch(() => {});
}

// ── Weather (Open-Meteo, free, no API key) ─────────────────────────────────
export interface WeatherNow {
  tempF: number;
  code: number;
  label: string;
  icon: string; // Ionicons name
  daily: { day: string; hiF: number; loF: number; icon: string }[];
}

// WMO weather code -> { label, Ionicons icon }
export function weatherInfo(code: number): { label: string; icon: string } {
  if (code === 0) return { label: 'Clear', icon: 'sunny-outline' };
  if (code <= 2) return { label: 'Partly cloudy', icon: 'partly-sunny-outline' };
  if (code === 3) return { label: 'Cloudy', icon: 'cloud-outline' };
  if (code <= 48) return { label: 'Foggy', icon: 'cloud-outline' };
  if (code <= 67) return { label: 'Rain', icon: 'rainy-outline' };
  if (code <= 77) return { label: 'Snow', icon: 'snow-outline' };
  if (code <= 82) return { label: 'Showers', icon: 'rainy-outline' };
  if (code <= 86) return { label: 'Snow showers', icon: 'snow-outline' };
  return { label: 'Thunderstorm', icon: 'thunderstorm-outline' };
}

export async function getWeather(lat: number, lng: number): Promise<WeatherNow | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code` +
      `&temperature_unit=fahrenheit&timezone=auto&forecast_days=4`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const j: any = await res.json();
    const code = j.current?.weather_code ?? 0;
    const info = weatherInfo(code);
    const days = (j.daily?.time ?? []).map((t: string, i: number) => {
      const di = weatherInfo(j.daily.weather_code[i]);
      return {
        day: new Date(t).toLocaleDateString('en-US', { weekday: 'short' }),
        hiF: Math.round(j.daily.temperature_2m_max[i]),
        loF: Math.round(j.daily.temperature_2m_min[i]),
        icon: di.icon,
      };
    });
    return {
      tempF: Math.round(j.current?.temperature_2m ?? 0),
      code,
      label: info.label,
      icon: info.icon,
      daily: days,
    };
  } catch {
    return null;
  }
}
