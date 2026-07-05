'use client';

// Full-screen Filters sheet — mirrors the user app's PremiumFilterSheet
// (recommended chips, type of place, dual price range, rooms & beds,
// property-type grid, amenities, booking options, accessibility).
// Amenity/accessibility ids use the shared wizard ids so filtering matches
// real listing data.
import { useEffect, useState } from 'react';
import { usePrefs } from './PrefsProvider';
import { WizIcon } from './WizIcon';

export interface FilterState {
  recommended: string[];                 // guest_fav | instant
  placeType: string;                     // Any type | Room | Entire home
  minPrice: number;
  maxPrice: number;
  bedrooms: string;                      // Any | 1..7 | 8+
  beds: string;
  bathrooms: string;
  propertyTypes: string[];               // House, Apartment, …
  amenities: string[];                   // wizard ids
  booking: string[];                     // instant_book | self_checkin | allows_pets
  accessibility: string[];               // wizard ids
}

export const PRICE_MIN = 10;
export const PRICE_MAX = 1000;

export const DEFAULT_FILTERS: FilterState = {
  recommended: [], placeType: 'Any type',
  minPrice: PRICE_MIN, maxPrice: PRICE_MAX,
  bedrooms: 'Any', beds: 'Any', bathrooms: 'Any',
  propertyTypes: [], amenities: [], booking: [], accessibility: [],
};

export function countActive(f: FilterState): number {
  return (
    f.recommended.length +
    (f.placeType !== 'Any type' ? 1 : 0) +
    (f.minPrice > PRICE_MIN || f.maxPrice < PRICE_MAX ? 1 : 0) +
    (f.bedrooms !== 'Any' ? 1 : 0) + (f.beds !== 'Any' ? 1 : 0) + (f.bathrooms !== 'Any' ? 1 : 0) +
    f.propertyTypes.length + f.amenities.length + f.booking.length + f.accessibility.length
  );
}

const RECOMMENDED = [
  { id: 'guest_fav', label: 'Guest favourite', icon: 'star' },
  { id: 'instant', label: 'Instant Book', icon: 'flash' },
];
const PLACE_TYPES = ['Any type', 'Room', 'Entire home'];
const ROOM_OPTIONS = ['Any', '1', '2', '3', '4', '5', '6', '7', '8+'];
const PROPERTY_TYPES = [
  { id: 'House', label: 'House', img: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=200&h=200&fit=crop' },
  { id: 'Apartment', label: 'Apartment', img: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=200&h=200&fit=crop' },
  { id: 'Villa', label: 'Villa', img: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=200&h=200&fit=crop' },
  { id: 'Cabin', label: 'Cabin', img: 'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=200&h=200&fit=crop' },
  { id: 'Loft', label: 'Loft', img: 'https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=200&h=200&fit=crop' },
  { id: 'Cottage', label: 'Cottage', img: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=200&h=200&fit=crop' },
  { id: 'Hotel', label: 'Hotel', img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=200&h=200&fit=crop' },
  { id: 'Guesthouse', label: 'Guest house', img: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=200&h=200&fit=crop' },
];
const AMENITIES_ESSENTIAL = [
  { id: 'wifi', label: 'Wifi' }, { id: 'kitchen', label: 'Kitchen' },
  { id: 'washer', label: 'Washer' }, { id: 'dryer', label: 'Dryer' },
  { id: 'ac', label: 'Air conditioning' }, { id: 'heating', label: 'Heating' },
  { id: 'workspace', label: 'Dedicated workspace' }, { id: 'tv', label: 'TV' },
];
const AMENITIES_MORE = [
  { id: 'pool', label: 'Pool' }, { id: 'hottub', label: 'Hot tub' },
  { id: 'parking', label: 'Free parking' }, { id: 'ev_charger', label: 'EV charger' },
  { id: 'crib', label: 'Crib' }, { id: 'gym', label: 'Gym' },
  { id: 'bbq', label: 'BBQ grill' }, { id: 'breakfast', label: 'Breakfast' },
  { id: 'fireplace', label: 'Indoor fireplace' }, { id: 'beachfront', label: 'Beachfront' },
  { id: 'waterfront', label: 'Waterfront' }, { id: 'lake_access', label: 'Lake access' },
];
const BOOKING_OPTIONS = [
  { id: 'instant_book', label: 'Instant Book', sub: 'Book without waiting for host approval', icon: 'flash' },
  { id: 'self_checkin', label: 'Self check-in', sub: 'Easy access to the property', icon: 'key' },
  { id: 'allows_pets', label: 'Allows pets', sub: 'Bringing a service animal?', icon: 'heart' },
];
const ACCESSIBILITY = [
  { id: 'step_free', label: 'Step-free guest entrance' },
  { id: 'wide_doorway', label: 'Wide entrance' },
  { id: 'accessible_bathroom', label: 'Accessible bathroom' },
  { id: 'grab_rails', label: 'Shower grab bar' },
];

export function FilterSheet({
  open, initial, countFor, onClose, onApply,
}: {
  open: boolean;
  initial: FilterState;
  /** Live result count for a draft filter state (updates the footer button). */
  countFor: (f: FilterState) => number;
  onClose: () => void;
  onApply: (f: FilterState) => void;
}) {
  const { format } = usePrefs();
  const [f, setF] = useState<FilterState>(initial);
  const [moreAmenities, setMoreAmenities] = useState(false);

  useEffect(() => { if (open) setF(initial); }, [open, initial]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);

  if (!open) return null;

  const toggle = (key: 'recommended' | 'propertyTypes' | 'amenities' | 'booking' | 'accessibility', v: string) =>
    setF((p) => ({ ...p, [key]: p[key].includes(v) ? p[key].filter((x) => x !== v) : [...p[key], v] }));

  const minPct = ((f.minPrice - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100;
  const maxPct = ((f.maxPrice - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-sheet fs-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-sheet-head fs-head">
          <button type="button" className="modal-x" aria-label="Close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
          <h3>Filters</h3>
          <span className="fs-head-spacer" />
        </div>

        <div className="fs-body">
          {/* Recommended */}
          <section className="fs-section">
            <h4>Recommended for you</h4>
            <div className="wiz-chips">
              {RECOMMENDED.map((r) => (
                <button key={r.id} type="button" className={`wiz-chip wiz-chip-lg${f.recommended.includes(r.id) ? ' is-sel' : ''}`} onClick={() => toggle('recommended', r.id)}>
                  <WizIcon name={r.icon} size={16} /><span>{r.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Type of place */}
          <section className="fs-section">
            <h4>Type of place</h4>
            <div className="fs-seg">
              {PLACE_TYPES.map((p) => (
                <button key={p} type="button" className={`fs-seg-btn${f.placeType === p ? ' is-sel' : ''}`} onClick={() => setF({ ...f, placeType: p })}>{p}</button>
              ))}
            </div>
          </section>

          {/* Price range — dual-thumb slider */}
          <section className="fs-section">
            <h4>Price range</h4>
            <p className="fs-sub">Nightly prices before fees and taxes</p>
            <div className="fs-range">
              <div className="fs-range-fill" style={{ left: `${minPct}%`, right: `${100 - maxPct}%` }} />
              <input type="range" min={PRICE_MIN} max={PRICE_MAX} step={10} value={f.minPrice} aria-label="Minimum price"
                onChange={(e) => setF({ ...f, minPrice: Math.min(Number(e.target.value), f.maxPrice - 50) })} />
              <input type="range" min={PRICE_MIN} max={PRICE_MAX} step={10} value={f.maxPrice} aria-label="Maximum price"
                onChange={(e) => setF({ ...f, maxPrice: Math.max(Number(e.target.value), f.minPrice + 50) })} />
            </div>
            <div className="fs-range-vals">
              <span className="fs-price-box"><small>Minimum</small>{format(f.minPrice)}</span>
              <span className="fs-price-box"><small>Maximum</small>{format(f.maxPrice)}{f.maxPrice >= PRICE_MAX ? '+' : ''}</span>
            </div>
          </section>

          {/* Rooms & beds */}
          <section className="fs-section">
            <h4>Rooms and beds</h4>
            {([['bedrooms', 'Bedrooms'], ['beds', 'Beds'], ['bathrooms', 'Bathrooms']] as const).map(([key, label]) => (
              <div key={key} className="fs-rooms-row">
                <span>{label}</span>
                <div className="fs-pills">
                  {ROOM_OPTIONS.map((o) => (
                    <button key={o} type="button" className={`fs-pill${f[key] === o ? ' is-sel' : ''}`} onClick={() => setF({ ...f, [key]: o })}>{o}</button>
                  ))}
                </div>
              </div>
            ))}
          </section>

          {/* Property type */}
          <section className="fs-section">
            <h4>Property type</h4>
            <div className="fs-prop-grid">
              {PROPERTY_TYPES.map((p) => (
                <button key={p.id} type="button" className={`fs-prop${f.propertyTypes.includes(p.id) ? ' is-sel' : ''}`} onClick={() => toggle('propertyTypes', p.id)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.img} alt="" loading="lazy" />
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Amenities */}
          <section className="fs-section">
            <h4>Amenities</h4>
            <p className="fs-sub">Essentials</p>
            <div className="wiz-chips">
              {AMENITIES_ESSENTIAL.map((a) => (
                <button key={a.id} type="button" className={`wiz-chip${f.amenities.includes(a.id) ? ' is-sel' : ''}`} onClick={() => toggle('amenities', a.id)}>
                  {f.amenities.includes(a.id) && <WizIcon name="check" size={14} />}<span>{a.label}</span>
                </button>
              ))}
              {moreAmenities && AMENITIES_MORE.map((a) => (
                <button key={a.id} type="button" className={`wiz-chip${f.amenities.includes(a.id) ? ' is-sel' : ''}`} onClick={() => toggle('amenities', a.id)}>
                  {f.amenities.includes(a.id) && <WizIcon name="check" size={14} />}<span>{a.label}</span>
                </button>
              ))}
            </div>
            <button type="button" className="fs-more" onClick={() => setMoreAmenities((m) => !m)}>
              {moreAmenities ? 'Show less' : 'Show more'} <WizIcon name="chevron" size={13} style={{ transform: moreAmenities ? 'rotate(-90deg)' : 'rotate(90deg)' }} />
            </button>
          </section>

          {/* Booking options */}
          <section className="fs-section">
            <h4>Booking options</h4>
            {BOOKING_OPTIONS.map((b) => (
              <button key={b.id} type="button" className={`fs-book${f.booking.includes(b.id) ? ' is-sel' : ''}`} onClick={() => toggle('booking', b.id)}>
                <WizIcon name={b.icon} size={20} />
                <span className="fs-book-text"><b>{b.label}</b><small>{b.sub}</small></span>
                <span className={`fs-check${f.booking.includes(b.id) ? ' is-on' : ''}`}>{f.booking.includes(b.id) && <WizIcon name="check" size={13} />}</span>
              </button>
            ))}
          </section>

          {/* Accessibility */}
          <section className="fs-section">
            <h4>Accessibility features</h4>
            <div className="wiz-chips">
              {ACCESSIBILITY.map((a) => (
                <button key={a.id} type="button" className={`wiz-chip${f.accessibility.includes(a.id) ? ' is-sel' : ''}`} onClick={() => toggle('accessibility', a.id)}>
                  {f.accessibility.includes(a.id) && <WizIcon name="check" size={14} />}<span>{a.label}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="fs-foot">
          <button type="button" className="cal-clear" onClick={() => setF(DEFAULT_FILTERS)}>Clear all</button>
          <button type="button" className="btn btn-primary" onClick={() => { onApply(f); onClose(); }}>
            Show {countFor(f)} {countFor(f) === 1 ? 'stay' : 'stays'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Apply the sheet's FilterState to a listing list (shared with SearchResults). */
export function applyFilters<T extends {
  priceUSD: number; bedrooms: number; beds: number; bathrooms: number;
  type: string; placeType: string; instantBook: boolean;
  ratingAvg: number; ratingCount: number; amenities: string[]; petsAllowed?: boolean;
}>(stays: T[], f: FilterState): T[] {
  const roomOk = (val: number, sel: string) =>
    sel === 'Any' || (sel === '8+' ? val >= 8 : val === Number(sel));
  return stays.filter((s) => {
    if (f.recommended.includes('guest_fav') && !(s.ratingCount > 0 && (s.ratingAvg ?? 0) >= 4.8)) return false;
    if (f.recommended.includes('instant') && !s.instantBook) return false;
    if (f.placeType === 'Entire home' && s.placeType && s.placeType !== 'entire') return false;
    if (f.placeType === 'Room' && !(s.placeType === 'room' || s.placeType === 'shared')) return false;
    if ((s.priceUSD || 0) < f.minPrice) return false;
    if (f.maxPrice < PRICE_MAX && (s.priceUSD || 0) > f.maxPrice) return false;
    if (!roomOk(s.bedrooms || 0, f.bedrooms)) return false;
    if (!roomOk(s.beds || 0, f.beds)) return false;
    if (!roomOk(s.bathrooms || 0, f.bathrooms)) return false;
    if (f.propertyTypes.length && !f.propertyTypes.some((t) => (s.type || '').toLowerCase().includes(t.toLowerCase()))) return false;
    const am = s.amenities || [];
    if (f.amenities.length && !f.amenities.every((a) => am.includes(a))) return false;
    if (f.booking.includes('instant_book') && !s.instantBook) return false;
    if (f.booking.includes('self_checkin') && !am.includes('self_checkin')) return false;
    if (f.booking.includes('allows_pets') && !(am.includes('pets') || s.petsAllowed)) return false;
    if (f.accessibility.length && !f.accessibility.every((a) => am.includes(a))) return false;
    return true;
  });
}
