// Location-aware lodging/occupancy tax engine.
//
// Hotel/short-stay accommodation is taxed very differently around the world:
//   • US states levy a state occupancy/sales tax + a separate local/city tax.
//   • The UK charges standard-rate VAT (20%) on accommodation.
//   • Most EU countries apply a *reduced* VAT rate to lodging plus a small
//     per-night-style "tourist tax" (modelled here as a small % of the base).
//
// These are pure functions — no UI, no side effects. They take the property
// location string (e.g. "Malibu, CA" or "Paris, France") and the taxable base
// (the subtotal in USD) and return discrete, labelled line items so the UI can
// render an honest, location-appropriate breakdown.

export interface TaxLine {
  label: string;
  amount: number;
}

export interface TaxBreakdown {
  lines: TaxLine[];
  total: number;
}

// ---------------------------------------------------------------------------
// US states — combined effective lodging tax split into a state line + a
// local/city line. Rates are realistic, representative figures (state sales/
// occupancy portion vs. typical city/county add-on).
// ---------------------------------------------------------------------------
interface UsRate {
  state: number; // state occupancy/sales tax portion
  local: number; // typical local/city tax add-on
}

const US_STATE_RATES: Record<string, UsRate> = {
  NY: { state: 0.08875, local: 0.0587 }, // NYC ~ 8.875% sales + ~5.875% hotel occupancy
  CA: { state: 0.0725, local: 0.0325 }, // ~7.25% + ~3.25% transient occupancy
  FL: { state: 0.06, local: 0.05 }, // 6% state + ~5% tourist development
  TX: { state: 0.06, local: 0.07 }, // 6% state + up to ~7% city/county
  NV: { state: 0.0685, local: 0.0613 }, // Las Vegas combined ~13%
  IL: { state: 0.06, local: 0.105 }, // Chicago hotel tax is famously high
  CO: { state: 0.029, local: 0.0712 }, // Denver lodgers tax
  WA: { state: 0.065, local: 0.04 },
  MA: { state: 0.057, local: 0.06 }, // Boston room occupancy
  HI: { state: 0.1025, local: 0.03 }, // transient accommodations + GET surcharge
  NJ: { state: 0.06625, local: 0.03 },
  GA: { state: 0.04, local: 0.05 },
  AZ: { state: 0.055, local: 0.05 },
  TN: { state: 0.07, local: 0.06 },
  LA: { state: 0.0445, local: 0.07 }, // New Orleans
  DC: { state: 0.1475, local: 0 }, // Washington DC flat hotel tax
};

const US_STATE_NAMES: Record<string, string> = {
  'new york': 'NY',
  california: 'CA',
  florida: 'FL',
  texas: 'TX',
  nevada: 'NV',
  illinois: 'IL',
  colorado: 'CO',
  washington: 'WA',
  massachusetts: 'MA',
  hawaii: 'HI',
  'new jersey': 'NJ',
  georgia: 'GA',
  arizona: 'AZ',
  tennessee: 'TN',
  louisiana: 'LA',
};

// Fallback rate for any US location whose state we recognise as US but isn't in
// the table above.
const US_DEFAULT: UsRate = { state: 0.06, local: 0.05 };

// ---------------------------------------------------------------------------
// EU — reduced VAT rate on lodging + a representative city/tourist tax (as a
// small % of base, standing in for the typical per-night levy).
// ---------------------------------------------------------------------------
interface EuRate {
  vat: number; // reduced VAT rate applied to accommodation
  city: number; // representative city/tourist tax as % of base (0 = none typical)
}

const EU_RATES: Record<string, EuRate> = {
  france: { vat: 0.1, city: 0.025 },
  italy: { vat: 0.1, city: 0.03 },
  spain: { vat: 0.1, city: 0.02 },
  netherlands: { vat: 0.09, city: 0.05 }, // Amsterdam tourist tax is high
  germany: { vat: 0.07, city: 0.05 },
  greece: { vat: 0.13, city: 0.015 },
  portugal: { vat: 0.06, city: 0.02 },
  austria: { vat: 0.1, city: 0.032 },
  belgium: { vat: 0.06, city: 0.03 },
  ireland: { vat: 0.09, city: 0 },
};

// ---------------------------------------------------------------------------

const r = (n: number) => Math.round(n);

function build(lines: TaxLine[]): TaxBreakdown {
  const cleaned = lines.filter((l) => l.amount > 0);
  return { lines: cleaned, total: cleaned.reduce((s, l) => s + l.amount, 0) };
}

// Detect a US 2-letter state code as a whole-word token (e.g. "Malibu, CA").
function detectUsStateCode(location: string): string | null {
  const upper = location.toUpperCase();
  const tokens = upper.split(/[^A-Z]+/).filter(Boolean);
  for (const code of Object.keys(US_STATE_RATES)) {
    if (tokens.includes(code)) return code;
  }
  // also accept any of the canonical 2-letter codes from the name map values
  return null;
}

/**
 * Compute a location-appropriate lodging tax breakdown.
 *
 * @param location  e.g. "New York, NY", "London, UK", "Paris, France"
 * @param taxableBase  the subtotal (in USD) to tax
 */
export function getTaxBreakdown(location: string, taxableBase: number): TaxBreakdown {
  const loc = (location || '').toLowerCase().trim();
  const base = Math.max(0, taxableBase || 0);

  // --- UK -------------------------------------------------------------------
  if (/\buk\b|united kingdom|england|scotland|wales|\blondon\b|edinburgh|manchester/.test(loc)) {
    return build([{ label: 'VAT (20%)', amount: r(base * 0.2) }]);
  }

  // --- EU -------------------------------------------------------------------
  for (const country of Object.keys(EU_RATES)) {
    if (loc.includes(country)) {
      const { vat, city } = EU_RATES[country];
      return build([
        { label: `VAT (${Math.round(vat * 100)}%)`, amount: r(base * vat) },
        { label: 'City/tourist tax', amount: r(base * city) },
      ]);
    }
  }

  // --- India (GST: split into CGST + SGST, like a real Indian invoice) -------
  const INDIA_RE = /\bindia\b|telangana|andhra|maharashtra|karnataka|tamil ?nadu|kerala|\bgoa\b|rajasthan|\bdelhi\b|gujarat|uttar ?pradesh|west ?bengal|punjab|haryana|hyderabad|mumbai|bengaluru|bangalore|chennai|kolkata|\bpune\b|jaipur|udaipur|jodhpur|kochi|cochin|ahmedabad|\bagra\b|varanasi|shimla|manali|rishikesh|mysuru|mysore|darjeeling/;
  if (INDIA_RE.test(loc)) {
    // 12% GST on accommodation up to ₹7,500/night, levied as CGST 6% + SGST 6%.
    const half = r((base * 0.12) / 2);
    return build([
      { label: 'CGST (6%)', amount: half },
      { label: 'SGST (6%)', amount: half },
    ]);
  }

  // --- Other countries — each with its own regime/labels --------------------
  const OTHER_TAXES: { re: RegExp; lines: (b: number) => TaxLine[] }[] = [
    { re: /\buae\b|united arab emirates|dubai|abu ?dhabi|sharjah/, lines: (b) => [{ label: 'VAT (5%)', amount: r(b * 0.05) }, { label: 'Tourism fee', amount: r(b * 0.05) }] },
    { re: /australia|sydney|melbourne|brisbane|perth|gold ?coast/, lines: (b) => [{ label: 'GST (10%)', amount: r(b * 0.1) }] },
    { re: /canada|toronto|vancouver|montreal|calgary|banff/, lines: (b) => [{ label: 'GST/HST (13%)', amount: r(b * 0.13) }] },
    { re: /singapore/, lines: (b) => [{ label: 'GST (9%)', amount: r(b * 0.09) }] },
    { re: /japan|tokyo|kyoto|osaka|hokkaido/, lines: (b) => [{ label: 'Consumption tax (10%)', amount: r(b * 0.1) }, { label: 'Accommodation tax', amount: r(b * 0.02) }] },
    { re: /thailand|bangkok|phuket|chiang ?mai|krabi/, lines: (b) => [{ label: 'VAT (7%)', amount: r(b * 0.07) }] },
    { re: /mexico|cancun|cancún|tulum|mexico ?city|cabo/, lines: (b) => [{ label: 'IVA (16%)', amount: r(b * 0.16) }, { label: 'Lodging tax (3%)', amount: r(b * 0.03) }] },
    { re: /brazil|rio|são ?paulo|sao ?paulo|salvador/, lines: (b) => [{ label: 'ISS service tax (5%)', amount: r(b * 0.05) }] },
    { re: /new ?zealand|auckland|queenstown|wellington/, lines: (b) => [{ label: 'GST (15%)', amount: r(b * 0.15) }] },
    { re: /switzerland|zurich|geneva|interlaken|zermatt/, lines: (b) => [{ label: 'VAT (3.8%)', amount: r(b * 0.038) }, { label: 'City tax', amount: r(b * 0.01) }] },
    { re: /turkey|istanbul|cappadocia|antalya/, lines: (b) => [{ label: 'VAT / KDV (10%)', amount: r(b * 0.1) }] },
    { re: /south ?africa|cape ?town|johannesburg/, lines: (b) => [{ label: 'VAT (15%)', amount: r(b * 0.15) }] },
    { re: /china|shanghai|beijing|shenzhen|hong ?kong/, lines: (b) => [{ label: 'VAT (6%)', amount: r(b * 0.06) }] },
    { re: /korea|seoul|busan|jeju/, lines: (b) => [{ label: 'VAT (10%)', amount: r(b * 0.1) }] },
    { re: /indonesia|bali|jakarta|ubud/, lines: (b) => [{ label: 'VAT (11%)', amount: r(b * 0.11) }, { label: 'Service tax', amount: r(b * 0.05) }] },
    { re: /malaysia|kuala ?lumpur|penang|langkawi/, lines: (b) => [{ label: 'SST (8%)', amount: r(b * 0.08) }, { label: 'Tourism tax', amount: r(b * 0.01) }] },
  ];
  for (const t of OTHER_TAXES) {
    if (t.re.test(loc)) return build(t.lines(base));
  }

  // --- US -------------------------------------------------------------------
  // Detect either a 2-letter state code token or a spelled-out state name.
  let stateCode = detectUsStateCode(location);
  if (!stateCode) {
    for (const name of Object.keys(US_STATE_NAMES)) {
      if (loc.includes(name)) {
        stateCode = US_STATE_NAMES[name];
        break;
      }
    }
  }
  const isUs = !!stateCode || /\busa\b|united states|\bus\b/.test(loc);
  if (isUs) {
    const rate = (stateCode && US_STATE_RATES[stateCode]) || US_DEFAULT;
    const label = stateCode ?? 'US';
    return build([
      { label: `${label} state occupancy tax`, amount: r(base * rate.state) },
      { label: 'Local/city tax', amount: r(base * rate.local) },
    ]);
  }

  // --- Fallback -------------------------------------------------------------
  // Unknown location — a single generic occupancy tax so the UI never breaks.
  return build([{ label: 'Occupancy tax', amount: r(base * 0.08) }]);
}

/**
 * Optional one-line human note describing how a location is taxed. Handy for
 * tooltips/subtitles. Pure, no UI.
 */
export function getTaxRateNote(location: string): string {
  const loc = (location || '').toLowerCase().trim();
  if (/\buk\b|united kingdom|england|scotland|wales|\blondon\b|edinburgh|manchester/.test(loc)) {
    return 'UK accommodation includes 20% VAT.';
  }
  for (const country of Object.keys(EU_RATES)) {
    if (loc.includes(country)) {
      const { vat } = EU_RATES[country];
      return `Reduced ${Math.round(vat * 100)}% VAT plus a local tourist tax applies.`;
    }
  }
  if (/\bindia\b|telangana|maharashtra|karnataka|kerala|\bgoa\b|rajasthan|\bdelhi\b|hyderabad|mumbai|bengaluru|bangalore|chennai|kolkata/.test(loc)) {
    return 'Indian GST applies, split into CGST + SGST (≈12% on accommodation).';
  }
  return 'State occupancy tax plus a local/city tax applies.';
}
