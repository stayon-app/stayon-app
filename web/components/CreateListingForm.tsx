'use client';

// Three-phase "list your place" wizard for the host website, mirroring the host
// app's ListingWizardScreen (overview → tell us about your place → make it stand
// out → finish up & publish). Monochrome solid-line icons; no colour glyphs.
import { useEffect, useRef, useState } from 'react';
import { host } from '@/lib/stayonClient';
<<<<<<< Updated upstream
import { usePrefs } from './PrefsProvider';
import { Price } from './Price';
import { WizIcon } from './WizIcon';
import {
  PLACE_TYPES, PLACE_KINDS, WHO_ELSE_OPTIONS, HIGHLIGHTS, DISCOUNT_OPTIONS,
  AMENITY_OPTIONS, AMENITY_CATEGORY_ORDER, SAFETY_OPTIONS, MIN_PHOTOS,
} from '@/lib/wizard';
=======
import { AMENITY_LABELS, AMENITY_FORM_IDS, HIGHLIGHT_OPTIONS, HIGHLIGHTS_MAX, VIBE_OPTIONS } from '@/lib/amenities';
>>>>>>> Stashed changes

const PHASE1 = ['p1intro', 'type', 'kind', 'location', 'basics', 'bathrooms', 'whoelse'];
const PHASE2 = ['p2intro', 'amenities', 'photos', 'title', 'highlights', 'description'];
const PHASE3 = ['p3intro', 'booking', 'price', 'weekend', 'discounts', 'safety', 'final'];
const STEPS = ['overview', ...PHASE1, ...PHASE2, ...PHASE3];

const INTRO = {
  p1intro: { n: 'Step 1', t: 'Tell us about your place', s: 'Share the type of property you have, whether guests book the whole place or a room, where it is, and how many guests can stay.', img: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1000&q=80&auto=format&fit=crop' },
  p2intro: { n: 'Step 2', t: 'Make your place stand out', s: 'Add the amenities your place offers, plus six or more photos. Then create a title and description.', img: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1000&q=80&auto=format&fit=crop' },
  p3intro: { n: 'Step 3', t: 'Finish up and publish', s: 'Choose your booking settings, set a price and discounts, then publish your listing.', img: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1000&q=80&auto=format&fit=crop' },
};

type Draft = {
  type: string; placeType: 'entire' | 'room' | 'shared';
  address: string; landmark: string; area: string; city: string; state: string; country: string; zipcode: string;
  guests: number; bedrooms: number; beds: number; bathrooms: number;
  bedroomLock: boolean | null; bathroomKind: 'private' | 'dedicated' | 'shared';
  whoElse: string[]; amenities: string[]; images: { file: File; preview: string }[];
  title: string; highlights: string[]; description: string;
  bookingApproval: 'approve5' | 'instant'; priceUSD: number; weekendPct: number;
  discounts: Record<string, boolean>; safety: string[];
  safetyDisclosures: Record<string, boolean>;
};

function readFile(file: File): Promise<{ b64: string; contentType: string }> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error('read failed'));
    r.onload = () => {
      const s = String(r.result || '');
      resolve({ b64: s.split(',')[1] || '', contentType: file.type || 'image/jpeg' });
    };
    r.readAsDataURL(file);
  });
}

const DRAFT_KEY = 'stayon_listing_draft';

export function CreateListingForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const { format } = usePrefs();
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [d, setD] = useState<Draft>({
    type: '', placeType: 'entire',
    address: '', landmark: '', area: '', city: '', state: '', country: 'India', zipcode: '',
    guests: 2, bedrooms: 1, beds: 1, bathrooms: 1,
    bedroomLock: null, bathroomKind: 'private',
    whoElse: [], amenities: [], images: [],
    title: '', highlights: [], description: '',
    bookingApproval: 'approve5', priceUSD: 100, weekendPct: 0,
    discounts: { newListing: true, lastMinute: false, weekly: false, monthly: false },
    safety: [], safetyDisclosures: { camera: false, noise: false, weapons: false },
  });
  const set = (p: Partial<Draft>) => setD((prev) => ({ ...prev, ...p }));
  const id = STEPS[i];

<<<<<<< Updated upstream
  // Restore a saved draft (Save & exit) once on open.
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved?.d) setD((prev) => ({ ...prev, ...saved.d, images: [] }));
      if (typeof saved?.i === 'number') setI(Math.min(saved.i, STEPS.length - 1));
      setStatus('Draft restored — re-attach your photos on the photo step.');
    } catch { /* corrupt draft is ignored */ }
  }, []);

  const toggle = (key: 'amenities' | 'safety' | 'whoElse' | 'highlights', v: string, max?: number) => {
    const cur = d[key];
    if (cur.includes(v)) set({ [key]: cur.filter((x) => x !== v) } as any);
    else if (!max || cur.length < max) set({ [key]: [...cur, v] } as any);
  };

  const phaseProg = (arr: string[]) =>
    arr.includes(id) ? (arr.indexOf(id) + 1) / arr.length : STEPS.indexOf(id) > STEPS.indexOf(arr[arr.length - 1]) ? 1 : 0;
  const segments = [phaseProg(PHASE1), phaseProg(PHASE2), phaseProg(PHASE3)];

  const canNext = (() => {
    if (id === 'type') return !!d.type;
    if (id === 'location') return !!(d.address.trim() && d.city.trim() && d.country.trim());
    if (id === 'photos') return d.images.length >= MIN_PHOTOS;
    if (id === 'title') return !!d.title.trim();
    if (id === 'price') return d.priceUSD > 0;
    return true;
  })();
=======
  const [moreOpen, setMoreOpen] = useState(false);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [highlights, setHighlights] = useState<string[]>([]);
  const [vibes, setVibes] = useState<string[]>([]);

  const set = (k: string, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));
>>>>>>> Stashed changes

  const toggleAmenity = (id: string) =>
    setAmenities((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const toggleHighlight = (id: string) =>
    setHighlights((p) => {
      if (p.includes(id)) return p.filter((x) => x !== id);
      if (p.length >= HIGHLIGHTS_MAX) return p;
      return [...p, id];
    });
  const toggleVibe = (id: string) =>
    setVibes((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    const next = Array.from(files)
      .filter((x) => x.type.startsWith('image/'))
      .map((file) => ({ file, preview: URL.createObjectURL(file) }));
    set({ images: [...d.images, ...next].slice(0, 20) });
  };

  // Save & exit — keep the draft (photos can't persist across reloads; the
  //   host re-attaches them, exactly like a browser refresh mid-upload).
  const saveExit = () => {
    try {
      const { images, ...rest } = d;
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ d: rest, i }));
    } catch { /* draft is best-effort */ }
    onCancel();
  };

  const back = () => (i === 0 ? onCancel() : setI(i - 1));
  const next = async () => {
    if (i < STEPS.length - 1) { setI(i + 1); return; }
    // final → upload photos then create + submit for review
    setBusy(true); setError('');
    try {
      const images: string[] = [];
      for (let n = 0; n < d.images.length; n++) {
        setStatus(`Uploading photo ${n + 1} of ${d.images.length}…`);
        const { b64, contentType } = await readFile(d.images[n].file);
        const { url } = await host.uploadPhoto(b64, contentType);
        images.push(url);
      }
      // Geocode the address so the listing shows on search maps (best-effort).
      setStatus('Locating your address…');
      let lat: number | undefined, lng: number | undefined;
      try {
        const q = [d.address, d.area, d.city, d.state, d.country].filter((x) => x.trim()).join(', ');
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`);
        const hit = res.ok ? (await res.json())[0] : null;
        if (hit) { lat = parseFloat(hit.lat); lng = parseFloat(hit.lon); }
      } catch { /* non-fatal — listing just won't be mapped yet */ }

      setStatus('Submitting for review…');
      await host.createListing({
<<<<<<< Updated upstream
        title: d.title.trim(), type: d.type, placeType: d.placeType,
        description: d.description.trim(),
        address: d.landmark.trim() ? `${d.address.trim()} (near ${d.landmark.trim()})` : d.address.trim(),
        area: d.area.trim(), city: d.city.trim(),
        state: d.state.trim(), country: d.country.trim(), zipcode: d.zipcode.trim(),
        lat, lng,
        guests: d.guests, bedrooms: d.bedrooms, beds: d.beds, bathrooms: d.bathrooms,
        priceUSD: d.priceUSD,
        weekendPriceUSD: Math.round(d.priceUSD * (1 + d.weekendPct / 100)),
        cleaningFeeUSD: 0,
        images, amenities: d.amenities, highlights: d.highlights,
        instantBook: d.bookingApproval === 'instant',
        safety: d.safety,
=======
        title: f.title.trim(),
        type: f.type,
        city: f.city.trim(),
        country: f.country.trim(),
        description: f.description.trim(),
        guests: Number(f.guests),
        bedrooms: Number(f.bedrooms),
        beds: Number(f.beds),
        bathrooms: Number(f.bathrooms),
        priceUSD: Number(f.priceUSD),
        cleaningFeeUSD: Number(f.cleaningFeeUSD) || 0,
        images,
        instantBook: f.instantBook,
        amenities,
        highlights,
        vibes,
>>>>>>> Stashed changes
      });
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      onCreated();
    } catch (err: any) {
      setError(err?.message || 'Could not create the listing.');
    } finally { setBusy(false); setStatus(''); }
  };

  const guestBefore = d.priceUSD;   // StayOn adds no guest service fee
  const youEarn = d.priceUSD;       // host keeps 100%

  return (
    <div className="wiz">
      {/* Top bar */}
      <div className="wiz-top">
        <span className="wiz-brand">StayOn</span>
        <button type="button" className="wiz-exit" onClick={saveExit}>Save &amp; exit</button>
      </div>

      <div className="wiz-scroll">
        {id === 'overview' && (
          <div className="wiz-body wiz-overview">
            <h2 className="wiz-h1">It's easy to list your place on StayOn</h2>
            {[
              { n: 1, t: 'Tell us about your place', s: 'Share some basic info, like where it is and how many guests can stay.' },
              { n: 2, t: 'Make it stand out', s: 'Add photos plus a title and description — we’ll help you out.' },
              { n: 3, t: 'Finish up and publish', s: 'Choose a starting price, verify a few details, then publish.' },
            ].map((x) => (
              <div key={x.n} className="wiz-ov-row">
                <span className="wiz-ov-num">{x.n}</span>
                <div><h3>{x.t}</h3><p>{x.s}</p></div>
              </div>
            ))}
          </div>
        )}

        {(id === 'p1intro' || id === 'p2intro' || id === 'p3intro') && (
          <div className="wiz-body wiz-intro">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={INTRO[id as keyof typeof INTRO].img} alt="" className="wiz-intro-img" loading="lazy" />
            <span className="wiz-step">{INTRO[id as keyof typeof INTRO].n}</span>
            <h2 className="wiz-h1">{INTRO[id as keyof typeof INTRO].t}</h2>
            <p className="wiz-lead">{INTRO[id as keyof typeof INTRO].s}</p>
          </div>
        )}

        {id === 'type' && (
          <div className="wiz-body">
            <h2 className="wiz-h2">Which of these best describes your place?</h2>
            <div className="wiz-type-grid">
              {PLACE_TYPES.map((t) => (
                <button key={t.id} type="button" className={`wiz-type${d.type === t.id ? ' is-sel' : ''}`} onClick={() => set({ type: t.id })}>
                  <WizIcon name={t.icon} size={26} />
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {id === 'kind' && (
          <div className="wiz-body">
            <h2 className="wiz-h2">What type of place will guests have?</h2>
            {PLACE_KINDS.map((k) => (
              <button key={k.id} type="button" className={`wiz-opt${d.placeType === k.id ? ' is-sel' : ''}`} onClick={() => set({ placeType: k.id })}>
                <div><h3>{k.label}</h3><p>{k.sub}</p></div>
                <WizIcon name={k.icon} size={24} />
              </button>
            ))}
          </div>
        )}

        {id === 'location' && (
          <div className="wiz-body">
            <h2 className="wiz-h2">Where's your place located?</h2>
            <p className="wiz-lead">Your exact address is only shared with guests after they've booked.</p>
            <Field label="Street address" value={d.address} onChange={(v) => set({ address: v })} ph="House no. & street" />
            <Field label="Nearby landmark (optional)" value={d.landmark} onChange={(v) => set({ landmark: v })} ph="Landmark" />
            <div className="wiz-row2">
              <Field label="District / locality" value={d.area} onChange={(v) => set({ area: v })} ph="Locality" />
              <Field label="City / town" value={d.city} onChange={(v) => set({ city: v })} ph="City" />
            </div>
            <div className="wiz-row2">
              <Field label="State / region" value={d.state} onChange={(v) => set({ state: v })} ph="State" />
              <Field label="PIN / ZIP code" value={d.zipcode} onChange={(v) => set({ zipcode: v })} ph="PIN" />
            </div>
            <Field label="Country / region" value={d.country} onChange={(v) => set({ country: v })} ph="Country" />
          </div>
        )}

        {id === 'basics' && (
          <div className="wiz-body">
            <h2 className="wiz-h2">Share some basics about your place</h2>
            <p className="wiz-sub">How many people can stay here?</p>
            <div className="wiz-card">
              <Counter label="Guests" value={d.guests} min={1} onChange={(v) => set({ guests: v })} />
              <Counter label="Bedrooms" value={d.bedrooms} onChange={(v) => set({ bedrooms: v })} />
              <Counter label="Beds" value={d.beds} min={1} onChange={(v) => set({ beds: v })} />
            </div>
            <p className="wiz-sub">Does every bedroom have a lock?</p>
            {[['Yes', true], ['No', false]].map(([lbl, val]) => (
              <button key={String(lbl)} type="button" className={`wiz-opt${d.bedroomLock === val ? ' is-sel' : ''}`} onClick={() => set({ bedroomLock: val as boolean })}>
                <h3>{lbl}</h3>
                <WizIcon name={d.bedroomLock === val ? 'radioOn' : 'radioOff'} size={22} />
              </button>
            ))}
          </div>
        )}

        {id === 'bathrooms' && (
          <div className="wiz-body">
            <h2 className="wiz-h2">What kind of bathrooms are available?</h2>
            <div className="wiz-card">
              <Counter label="Bathrooms" sub="Total available to guests" value={d.bathrooms} onChange={(v) => set({ bathrooms: v })} />
            </div>
            <p className="wiz-sub">These bathrooms are…</p>
            {([['private', 'Private and attached'], ['dedicated', 'Dedicated'], ['shared', 'Shared']] as const).map(([k, lbl]) => (
              <button key={k} type="button" className={`wiz-opt${d.bathroomKind === k ? ' is-sel' : ''}`} onClick={() => set({ bathroomKind: k })}>
                <h3>{lbl}</h3>
                <WizIcon name={d.bathroomKind === k ? 'radioOn' : 'radioOff'} size={22} />
              </button>
            ))}
          </div>
        )}

        {id === 'whoelse' && (
          <div className="wiz-body">
            <h2 className="wiz-h2">Who else might be there?</h2>
            <p className="wiz-lead">Guests want to know whether they'll meet other people during their stay.</p>
            <div className="wiz-type-grid">
              {WHO_ELSE_OPTIONS.map((w) => (
                <button key={w.id} type="button" className={`wiz-type${d.whoElse.includes(w.id) ? ' is-sel' : ''}`} onClick={() => toggle('whoElse', w.id)}>
                  <WizIcon name={w.icon} size={24} />
                  <span>{w.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {id === 'amenities' && (
          <div className="wiz-body">
            <h2 className="wiz-h2">Tell guests what your place offers</h2>
            {AMENITY_CATEGORY_ORDER.map((cat) => {
              const items = AMENITY_OPTIONS.filter((a) => a.category === cat);
              if (!items.length) return null;
              return (
                <div key={cat} className="wiz-am-group">
                  <p className="wiz-am-cat">{cat}</p>
                  <div className="wiz-chips">
                    {items.map((a) => {
                      const sel = d.amenities.includes(a.id);
                      return (
                        <button key={a.id} type="button" className={`wiz-chip${sel ? ' is-sel' : ''}`} onClick={() => toggle('amenities', a.id)}>
                          {sel && <WizIcon name="check" size={15} />}<span>{a.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {id === 'photos' && (
          <div className="wiz-body">
            <h2 className="wiz-h2">Add some photos of your place</h2>
            <p className="wiz-lead">You'll need at least {MIN_PHOTOS} photos to publish. You can add more or reorder later.</p>
            <label className="wiz-dropzone">
              <input type="file" accept="image/*" multiple onChange={(e) => addPhotos(e.target.files)} />
              <WizIcon name="images" size={22} /><span>Add photos from your device</span>
            </label>
            <p className={`wiz-count${d.images.length >= MIN_PHOTOS ? ' is-ok' : ''}`}>{d.images.length}/{MIN_PHOTOS} added</p>
            <div className="wiz-photo-grid">
              {d.images.map((p, idx) => (
                <div key={idx} className="wiz-photo">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.preview} alt={`photo ${idx + 1}`} />
                  <button type="button" className="wiz-photo-x" onClick={() => set({ images: d.images.filter((_, j) => j !== idx) })} aria-label="Remove"><WizIcon name="close" size={13} /></button>
                  {idx === 0 && <span className="wiz-cover">Cover</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {id === 'title' && (
          <div className="wiz-body">
            <h2 className="wiz-h2">Now, give your place a title</h2>
            <p className="wiz-lead">Short titles work best. Have fun — you can always change it later.</p>
            <textarea className="wiz-title-input" value={d.title} maxLength={50} rows={2}
              onChange={(e) => set({ title: e.target.value.slice(0, 50) })} placeholder="e.g. Sunlit loft near the river" />
            <p className="wiz-lead">{50 - d.title.length} characters available</p>
          </div>
        )}

        {id === 'highlights' && (
          <div className="wiz-body">
            <h2 className="wiz-h2">Next, let's describe your place</h2>
            <p className="wiz-lead">Choose up to 2 highlights. We'll use these to get your description started.</p>
            <div className="wiz-chips">
              {HIGHLIGHTS.map((h) => {
                const sel = d.highlights.includes(h.id);
                return (
                  <button key={h.id} type="button" className={`wiz-chip wiz-chip-lg${sel ? ' is-sel' : ''}`} onClick={() => toggle('highlights', h.id, 2)}>
                    <WizIcon name={h.icon} size={18} /><span>{h.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {id === 'description' && (
          <div className="wiz-body">
            <h2 className="wiz-h2">Create your description</h2>
            <p className="wiz-lead">Share what makes your place special.</p>
            <textarea className="wiz-textarea" value={d.description} rows={6}
              onChange={(e) => set({ description: e.target.value })} placeholder="You'll love this place because…" />
          </div>
        )}

        {id === 'booking' && (
          <div className="wiz-body">
            <h2 className="wiz-h2">Pick your booking settings</h2>
            <p className="wiz-lead">You can change this at any time.</p>
            {([['approve5', 'Approve your first 5 bookings', 'Start by reviewing requests, then switch to Instant Book.', 'Recommended', 'calendar'], ['instant', 'Use Instant Book', 'Let guests book automatically.', '', 'flash']] as const).map(([k, t, s, tag, ic]) => (
              <button key={k} type="button" className={`wiz-opt${d.bookingApproval === k ? ' is-sel' : ''}`} onClick={() => set({ bookingApproval: k })}>
                <div><h3>{t}</h3>{tag && <span className="wiz-recommend">{tag}</span>}<p>{s}</p></div>
                <WizIcon name={ic} size={22} />
              </button>
            ))}
          </div>
        )}

        {id === 'price' && (
          <div className="wiz-body wiz-price-body">
            <h2 className="wiz-h2">Now, set your nightly price</h2>
            <p className="wiz-lead">Tip: price a little lower at first to land your first bookings and reviews, then raise it.</p>
            <div className="wiz-price-hero">
              <div className="wiz-price-amount"><Price usd={d.priceUSD} /></div>
              <input className="wiz-price-slider" type="range" min={10} max={1000} step={5} value={d.priceUSD}
                onChange={(e) => set({ priceUSD: Number(e.target.value) })}
                style={{ ['--pct' as any]: `${((d.priceUSD - 10) / 990) * 100}%` }} />
              <div className="wiz-price-ends"><span>{format(10)}</span><span>{format(1000)}</span></div>
            </div>
            <div className="wiz-breakdown">
              <div className="wiz-bk"><span>Base price</span><b><Price usd={d.priceUSD} /></b></div>
              <div className="wiz-bk"><span>StayOn service fee</span><b className="wiz-free">Free</b></div>
              <div className="wiz-bk wiz-bk-top"><span>Guest price before taxes</span><b><Price usd={guestBefore} /></b></div>
            </div>
            <div className="wiz-breakdown wiz-earn">
              <div className="wiz-bk"><span>You earn</span><b><Price usd={youEarn} /></b></div>
            </div>
            <p className="wiz-lead">StayOn charges no service fee — to guests or to you. The guest pays exactly your price plus taxes, and you keep the full amount.</p>
          </div>
        )}

        {id === 'weekend' && (
          <div className="wiz-body wiz-price-body">
            <h2 className="wiz-h2">Add a weekend price</h2>
            <p className="wiz-lead">Add a premium for Fridays and Saturdays — or keep it the same.</p>
            <div className="wiz-price-hero">
              <div className="wiz-price-amount"><Price usd={Math.round(d.priceUSD * (1 + d.weekendPct / 100))} /></div>
            </div>
            <div className="wiz-chips wiz-center">
              {[0, 5, 10, 15, 20].map((p) => (
                <button key={p} type="button" className={`wiz-chip wiz-chip-lg${d.weekendPct === p ? ' is-sel' : ''}`} onClick={() => set({ weekendPct: p })}>
                  <span>{p === 0 ? 'No premium' : `+${p}%`}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {id === 'discounts' && (
          <div className="wiz-body">
            <h2 className="wiz-h2">Add discounts</h2>
            <p className="wiz-lead">Help your place get booked faster and earn your first reviews.</p>
            {DISCOUNT_OPTIONS.map((o) => {
              const on = d.discounts[o.id];
              return (
                <button key={o.id} type="button" className={`wiz-disc${on ? ' is-sel' : ''}`} onClick={() => set({ discounts: { ...d.discounts, [o.id]: !on } })}>
                  <span className="wiz-disc-pct">{o.pct}</span>
                  <div><h3>{o.title}</h3><p>{o.sub}</p></div>
                  <WizIcon name={on ? 'check' : 'plus'} size={20} />
                </button>
              );
            })}
            <p className="wiz-lead">Only one discount applies per stay.</p>
          </div>
        )}

        {id === 'safety' && (
          <div className="wiz-body">
            <h2 className="wiz-h2">Share safety details</h2>
            <p className="wiz-lead">Does your place have any of these?</p>
            {([['camera', 'Exterior security camera present'], ['noise', 'Noise decibel monitor present'], ['weapons', 'Weapon(s) on the property']] as const).map(([k, lbl]) => {
              const on = d.safetyDisclosures[k];
              return (
                <button key={k} type="button" className="wiz-safety" onClick={() => set({ safetyDisclosures: { ...d.safetyDisclosures, [k]: !on } })}>
                  <span>{lbl}</span>
                  <WizIcon name={on ? 'check' : 'plus'} size={20} />
                </button>
              );
            })}
            <p className="wiz-sub">Safety items at your place</p>
            <div className="wiz-chips">
              {SAFETY_OPTIONS.map((s) => {
                const sel = d.safety.includes(s.id);
                return (
                  <button key={s.id} type="button" className={`wiz-chip${sel ? ' is-sel' : ''}`} onClick={() => toggle('safety', s.id)}>
                    {sel && <WizIcon name="check" size={15} />}<span>{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {id === 'final' && (
          <div className="wiz-body">
            <h2 className="wiz-h2">Review and publish</h2>
            <p className="wiz-lead">Here's a quick look at your listing. You can edit anything later. It's <b>submitted for review</b> and goes live once approved — 0% commission.</p>
            <div className="wiz-review">
              {d.images[0]
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={d.images[0].preview} alt="" className="wiz-review-img" />
                : <div className="wiz-review-img wiz-review-blank" />}
              <div className="wiz-review-body">
                <h3>{d.title || 'Your listing'}</h3>
                <p>{[d.city, d.country].filter(Boolean).join(', ')}</p>
                <p>{d.type || '—'} · {d.guests} guests · {d.bedrooms} bd · {d.bathrooms} ba</p>
                <p className="wiz-review-price"><Price usd={d.priceUSD} /> / night · {d.images.length} photos · {d.amenities.length} amenities</p>
              </div>
            </div>
            {status && <p className="muted">{status}</p>}
            {error && <p className="modal-error">{error}</p>}
          </div>
        )}
      </div>

      {/* Progress segments (3 phases) */}
      {i > 0 && (
        <div className="wiz-progress">
          {segments.map((p, idx) => (
            <div key={idx} className="wiz-seg"><div className="wiz-seg-fill" style={{ width: `${Math.round(p * 100)}%` }} /></div>
          ))}
        </div>
      )}

<<<<<<< Updated upstream
      {/* Footer nav */}
      <div className="wiz-footer">
        <button type="button" className="wiz-back" onClick={back} disabled={busy}>Back</button>
        <button type="button" className="btn btn-primary wiz-next" onClick={next} disabled={!canNext || busy}>
          {busy ? 'Submitting…' : i === 0 ? 'Get started' : id === 'final' ? 'Create listing' : 'Next'}
        </button>
=======
      <button type="button" className="hf-more-toggle" onClick={() => setMoreOpen((v) => !v)}>
        {moreOpen ? '− Hide more details' : '+ More details (amenities, highlights, vibe)'}
      </button>

      {moreOpen && (
        <div className="hf-more">
          <div className="hf-field">
            <span>Amenities</span>
            <div className="hf-amenity-grid">
              {AMENITY_FORM_IDS.map((id) => (
                <label key={id}>
                  <input type="checkbox" checked={amenities.includes(id)} onChange={() => toggleAmenity(id)} />
                  {AMENITY_LABELS[id]}
                </label>
              ))}
            </div>
          </div>

          <div className="hf-field">
            <span>Highlights (up to {HIGHLIGHTS_MAX})</span>
            <div className="chip-picker">
              {HIGHLIGHT_OPTIONS.map((o) => {
                const active = highlights.includes(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    className={`chip-btn ${active ? 'active' : ''}`}
                    disabled={!active && highlights.length >= HIGHLIGHTS_MAX}
                    onClick={() => toggleHighlight(o.id)}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="hf-field">
            <span>Vibe</span>
            <div className="chip-picker-group">
              <span className="chip-picker-label">Setting</span>
              <div className="chip-picker">
                {VIBE_OPTIONS.filter((o) => o.group === 'setting').map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    className={`chip-btn ${vibes.includes(o.id) ? 'active' : ''}`}
                    onClick={() => toggleVibe(o.id)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="chip-picker-group">
              <span className="chip-picker-label">Match your vibe</span>
              <div className="chip-picker">
                {VIBE_OPTIONS.filter((o) => o.group === 'vibe').map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    className={`chip-btn ${vibes.includes(o.id) ? 'active' : ''}`}
                    onClick={() => toggleVibe(o.id)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <label className="hf-check">
        <input type="checkbox" checked={f.instantBook} onChange={(e) => set('instantBook', e.target.checked)} />
        <span>Instant book (guests book without approval)</span>
      </label>

      <p className="hf-note">Prices are in USD; guests see them in their own currency. Your listing is <b>submitted for review</b> and goes live once our team approves it — 0% commission.</p>
      {status && <p className="muted">{status}</p>}
      {error && <p className="modal-error">{error}</p>}

      <div className="hf-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Submitting…' : 'Submit for review'}</button>
>>>>>>> Stashed changes
      </div>
    </div>
  );
}

function Field({ label, value, onChange, ph }: { label: string; value: string; onChange: (v: string) => void; ph: string }) {
  return (
    <label className="wiz-field">
      <span>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={ph} />
    </label>
  );
}

function Counter({ label, sub, value, min = 0, onChange }: { label: string; sub?: string; value: number; min?: number; onChange: (v: number) => void }) {
  return (
    <div className="wiz-counter">
      <div><span className="wiz-counter-label">{label}</span>{sub && <span className="wiz-counter-sub">{sub}</span>}</div>
      <div className="wiz-counter-ctrl">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="Decrease"><WizIcon name="minus" size={16} /></button>
        <span className="wiz-counter-val">{value}</span>
        <button type="button" onClick={() => onChange(value + 1)} aria-label="Increase"><WizIcon name="plus" size={16} /></button>
      </div>
    </div>
  );
}
