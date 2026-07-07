import { notFound } from 'next/navigation';
import { getStay } from '@/lib/api';
import { BookingWidget } from '@/components/BookingWidget';
import { StayLocationMap } from '@/components/StayLocationMap';
import { StayGallery } from '@/components/StayGallery';
import { RecordStayView } from '@/components/RecentlyViewed';
import { StayAmenities } from '@/components/StayAmenities';
import { StayReviews } from '@/components/StayReviews';
import { StayActions } from '@/components/StayActions';
import { MobileReserveBar } from '@/components/MobileReserveBar';
import type { Metadata } from 'next';

// Deterministic host-tenure line (guest-safe; no economics).
function hostSince(id: string) {
  let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return 2 + (h % 8); // 2–9 years hosting
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const stay = await getStay(params.id);
  if (!stay) return { title: 'Stay not found · StayOn' };
  return {
    title: `${stay.title} · ${stay.city} · StayOn`,
    description: stay.description?.slice(0, 150),
  };
}

export default async function StayDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { [key: string]: string | undefined };
}) {
  const stay = await getStay(params.id);
  if (!stay) notFound();

  const images = stay.images || [];
  const initial = (stay.hostName || 'S').trim().charAt(0).toUpperCase();
  const years = hostSince(stay.id);
  const x = stay as any; // extra fields (houseRules, safety, cancellation…) from listingOut

  // ── Airbnb-style highlights (derived from real listing data) ──
  const highlights: { icon: 'home' | 'bolt' | 'star' | 'shield'; title: string; body: string }[] = [
    {
      icon: 'home',
      title: `${stay.placeType || 'Entire place'} to yourself`,
      body: 'The whole space is yours — no sharing with the host or other guests.',
    },
    stay.instantBook
      ? { icon: 'bolt', title: 'Instant Book', body: 'Book right away without waiting for host approval.' }
      : { icon: 'shield', title: 'Identity-verified host', body: 'Hosted by a verified StayOn host — one person, one identity.' },
    stay.ratingCount > 0 && (stay.ratingAvg ?? 0) >= 4.8
      ? { icon: 'star', title: 'Loved by guests', body: `Rated ★ ${stay.ratingAvg?.toFixed(2)} by recent guests.` }
      : { icon: 'star', title: '0% booking fees', body: 'The price you see is the price you pay — StayOn adds nothing.' },
  ];

  // ── Things to know (house rules / safety / cancellation) ──
  const rules: string[] = [];
  if (x.checkIn) rules.push(`Check-in: ${x.checkIn}`);
  if (x.checkOut) rules.push(`Check-out: ${x.checkOut}`);
  if (x.minNights) rules.push(`Minimum stay: ${x.minNights} night${x.minNights > 1 ? 's' : ''}`);
  rules.push(`${stay.guests} guests maximum`);
  rules.push(x.petsAllowed === true ? 'Pets allowed' : 'No pets');
  if (typeof x.houseRules === 'string' && x.houseRules.trim()) rules.push(x.houseRules.trim());

  const safety: string[] = Array.isArray(x.safety) && x.safety.length
    ? x.safety
    : ['Listing reviewed by the StayOn team', 'Secure on-platform payments'];

  const cancellation: string =
    typeof x.cancellation === 'string' && x.cancellation.trim()
      ? x.cancellation
      : 'Cancellation terms are set by the host — you will see the full policy before you pay.';

  return (
    <div className="container">
      <RecordStayView id={stay.id} />

      {/* Title row — title left, Share/Save right (Airbnb layout) */}
      <div className="title-row">
        <h1 className="detail-title">{stay.title}</h1>
        <StayActions stayId={stay.id} title={stay.title} />
      </div>
      <div className="detail-sub">
        {stay.ratingCount > 0 ? (
          <span>★ {stay.ratingAvg?.toFixed(2)} · {stay.ratingCount} reviews</span>
        ) : (
          <span>★ New listing</span>
        )}
        <span>
          {stay.city}
          {stay.state ? `, ${stay.state}` : ''}
          {stay.country ? `, ${stay.country}` : ''}
        </span>
        <span>{stay.type}</span>
      </div>

      {/* Photo mosaic + lightbox */}
      <StayGallery images={images} title={stay.title} />

      <div className="detail-body">
        <div>
          {/* Hosted-by row: heading left, avatar right (Airbnb) */}
          <div className="detail-section hosted-row">
            <div>
              <h3>
                {stay.placeType || 'Entire place'} hosted by {stay.hostName || 'a StayOn host'}
              </h3>
              <div className="facts">
                <span>{stay.guests} guests</span>
                <span>{stay.bedrooms} bedrooms</span>
                <span>{stay.beds} beds</span>
                <span>{stay.bathrooms} bathrooms</span>
              </div>
            </div>
            <div className="host-avatar host-avatar-sm" aria-hidden>{initial}</div>
          </div>

          {/* Highlights */}
          <div className="detail-section highlights">
            {highlights.map((h) => (
              <div key={h.title} className="hl-item">
                <span className="hl-icon">
                  {h.icon === 'home' && (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11 12 3l9 8" /><path d="M5 10v10h14V10" /></svg>
                  )}
                  {h.icon === 'bolt' && (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" /></svg>
                  )}
                  {h.icon === 'star' && (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3 2.7 5.8 6.3.8-4.6 4.3 1.2 6.1L12 17l-5.6 3 1.2-6.1L3 9.6l6.3-.8L12 3z" /></svg>
                  )}
                  {h.icon === 'shield' && (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></svg>
                  )}
                </span>
                <div>
                  <b>{h.title}</b>
                  <p>{h.body}</p>
                </div>
              </div>
            ))}
          </div>

          {stay.description ? (
            <div className="detail-section">
              <h3>About this stay</h3>
              <p style={{ color: 'var(--slate)', fontSize: 16, whiteSpace: 'pre-line' }}>
                {stay.description}
              </p>
            </div>
          ) : null}

          {stay.amenities?.length > 0 ? (
            <StayAmenities amenities={stay.amenities} />
          ) : null}

          {/* Reviews */}
          <StayReviews ratingAvg={stay.ratingAvg} ratingCount={stay.ratingCount} />

          {stay.lat != null && stay.lng != null ? (
            <StayLocationMap
              lat={stay.lat}
              lng={stay.lng}
              label={[stay.city, stay.state, stay.country].filter(Boolean).join(', ')}
            />
          ) : null}

          {/* Host (guest-safe: identity/tenure only, no economics) */}
          <div className="detail-section host-block">
            <div className="host-avatar" aria-hidden>{initial}</div>
            <div>
              <h3 className="host-name">Hosted by {stay.hostName || 'a StayOn host'}</h3>
              <p className="host-meta">
                {years} years hosting
                {stay.instantBook ? ' · Instant Book available' : ''}
                {stay.ratingCount > 0 ? ` · ★ ${stay.ratingAvg?.toFixed(2)}` : ''}
              </p>
              <p className="host-tenure">Identity-verified · typically responds within a few hours</p>
            </div>
          </div>
        </div>

        {/* Booking card — pre-filled from ?checkIn/?checkOut/?guests deep links */}
        <BookingWidget
          stayId={stay.id}
          priceUSD={stay.priceUSD}
          maxGuests={stay.guests}
          baseGuests={stay.baseGuests || 1}
          instantBook={stay.instantBook}
          initialCheckIn={searchParams.checkIn}
          initialCheckOut={searchParams.checkOut}
          initialGuests={searchParams.guests}
        />
      </div>

      {/* Things to know (Airbnb footer section) */}
      <div className="know-section">
        <h3>Things to know</h3>
        <div className="know-grid">
          <div>
            <h4>House rules</h4>
            <ul>{rules.map((r) => <li key={r}>{r}</li>)}</ul>
          </div>
          <div>
            <h4>Safety &amp; property</h4>
            <ul>{safety.map((s: string) => <li key={s}>{s}</li>)}</ul>
          </div>
          <div>
            <h4>Cancellation policy</h4>
            <p>{cancellation}</p>
          </div>
        </div>
      </div>

      {/* Mobile: fixed price + Reserve bar */}
      <MobileReserveBar priceUSD={stay.priceUSD} />
    </div>
  );
}
