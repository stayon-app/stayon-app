import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getStay, searchStays } from '@/lib/api';
import { BookingWidget } from '@/components/BookingWidget';
<<<<<<< Updated upstream
import { StayLocationMap } from '@/components/StayLocationMap';
import { StayGallery } from '@/components/StayGallery';
import { RecordStayView } from '@/components/RecentlyViewed';
import { StayAmenities } from '@/components/StayAmenities';
import { StayReviews } from '@/components/StayReviews';
=======
import { StayCard } from '@/components/StayCard';
import { LocationMap } from '@/components/LocationMap';
import { PhotoLightbox } from '@/components/PhotoLightbox';
import { Reveal } from '@/components/Reveal';
import { TiltCard } from '@/components/TiltCard';
import {
  AMENITY_LABELS,
  HIGHLIGHT_OPTIONS,
  VIBE_OPTIONS,
  SAFETY_LABELS,
  prettifyId,
} from '@/lib/amenities';
>>>>>>> Stashed changes
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

const labelFor = (id: string, map: { id: string; label: string }[]) =>
  map.find((o) => o.id === id)?.label || prettifyId(id);

export default async function StayDetailPage({ params }: { params: { id: string } }) {
  const stay = await getStay(params.id);
  if (!stay) notFound();

  const images = stay.images || [];
  const initial = (stay.hostName || 'S').trim().charAt(0).toUpperCase();

  const isGuestFavorite = stay.ratingAvg >= 4.8 && stay.ratingCount >= 10;
  const isNewListing = stay.ratingCount === 0;

  const highlights = (stay.highlights || []).slice(0, 2);
  const vibes = stay.vibes || [];
  const amenities = (stay.amenities || []).slice(0, 12);
  const safety = stay.safety || [];
  const reviews = stay.reviews || [];

  const knowCards = [
    stay.houseRules ? { title: 'House rules', body: <p>{stay.houseRules}</p> } : null,
    stay.checkIn || stay.checkOut || stay.minNights
      ? {
          title: 'Check-in / check-out',
          body: (
            <ul>
              {stay.checkIn ? <li>Check-in after {stay.checkIn}</li> : null}
              {stay.checkOut ? <li>Check-out before {stay.checkOut}</li> : null}
              {stay.minNights ? <li>{stay.minNights}+ night minimum</li> : null}
              {typeof stay.petsAllowed === 'boolean' ? (
                <li>{stay.petsAllowed ? 'Pets allowed' : 'No pets'}</li>
              ) : null}
            </ul>
          ),
        }
      : null,
    safety.length > 0
      ? {
          title: 'Safety & property',
          body: (
            <ul>
              {safety.map((id) => (
                <li key={id}>{SAFETY_LABELS[id] || prettifyId(id)}</li>
              ))}
            </ul>
          ),
        }
      : null,
    stay.cancellation ? { title: 'Cancellation policy', body: <p>{stay.cancellation}</p> } : null,
  ].filter(Boolean) as { title: string; body: React.ReactNode }[];

  const locationLabel = [stay.city, stay.state, stay.country].filter(Boolean).join(', ');

  const similarResults = stay.city ? await searchStays({ city: stay.city }) : { results: [], total: 0 };
  const similar = similarResults.results.filter((s) => s.id !== stay.id).slice(0, 4);

  return (
    <div className="container">
<<<<<<< Updated upstream
      <RecordStayView id={stay.id} />
      <h1 className="detail-title">{stay.title}</h1>
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
=======
      <div className="badge-strip">
        {isGuestFavorite ? <span className="trust-badge">★ Guest favourite</span> : null}
        {stay.instantBook ? <span className="trust-badge tb-indigo">⚡ Instant Book</span> : null}
        {isNewListing ? <span className="trust-badge tb-amber">✦ New listing</span> : null}
>>>>>>> Stashed changes
      </div>
      <h1 className="detail-title">{stay.title}</h1>
      <Reveal>
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
      </Reveal>

<<<<<<< Updated upstream
      {/* Gallery + lightbox */}
      <StayGallery images={images} title={stay.title} />
=======
      {/* Gallery */}
      <div className="gallery-wrap">
        <div className="gallery">
          {gallery.length > 0 ? (
            gallery.map((src, i) =>
              i === 0 ? (
                <TiltCard key={i} className="g-main" maxTilt={2}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`${stay.title} photo ${i + 1}`} />
                </TiltCard>
              ) : (
                <div key={i}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`${stay.title} photo ${i + 1}`} />
                </div>
              ),
            )
          ) : (
            <div className="g-main g-empty">No photos yet</div>
          )}
        </div>
        {images.length > 5 ? <PhotoLightbox images={images} /> : null}
      </div>
>>>>>>> Stashed changes

      <div className="detail-body">
        <div>
          <div className="detail-section">
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

          {highlights.length > 0 ? (
            <div className="detail-section">
              <div className="highlight-row">
                {highlights.map((id) => (
                  <span key={id} className="highlight-chip">
                    ✦ {labelFor(id, HIGHLIGHT_OPTIONS)}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {stay.description ? (
            <Reveal className="detail-section">
              <h3>About this stay</h3>
              <p style={{ color: 'var(--slate)', fontSize: 16, whiteSpace: 'pre-line' }}>
                {stay.description}
              </p>
            </Reveal>
          ) : null}

          {vibes.length > 0 ? (
            <div className="detail-section">
              <h3>The vibe</h3>
              <div className="vibe-row">
                {vibes.map((id) => (
                  <span key={id} className="vibe-chip">
                    {labelFor(id, VIBE_OPTIONS)}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

<<<<<<< Updated upstream
          {stay.amenities?.length > 0 ? (
            <StayAmenities amenities={stay.amenities} />
=======
          {amenities.length > 0 ? (
            <div className="detail-section">
              <h3>What this place offers</h3>
              <div className="amenity-grid-rich">
                {amenities.map((id) => (
                  <div key={id} className="am-item">
                    <span className="am-dot" />
                    {AMENITY_LABELS[id] || prettifyId(id)}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {knowCards.length > 0 ? (
            <div className="detail-section">
              <h3>Things to know</h3>
              <div className="know-grid">
                {knowCards.map((c) => (
                  <div key={c.title} className="know-card">
                    <h4>{c.title}</h4>
                    {c.body}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {stay.lat != null && stay.lng != null ? (
            <div className="detail-section">
              <h3>Where you&apos;ll be</h3>
              <LocationMap lat={stay.lat} lng={stay.lng} label={locationLabel} />
            </div>
          ) : null}

          <div className="detail-section">
            <h3>Meet your host</h3>
            <div className="host-card">
              <div className="avatar avatar-lg">{(stay.hostName || 'H').charAt(0).toUpperCase()}</div>
              <div>
                <h4>{stay.hostName || 'StayOn host'}</h4>
                {stay.hostLanguages?.length ? <p>Speaks {stay.hostLanguages.join(', ')}</p> : null}
                {stay.ratingCount > 0 ? (
                  <p>★ {stay.ratingAvg?.toFixed(2)} · {stay.ratingCount} reviews on this stay</p>
                ) : null}
              </div>
            </div>
          </div>

          {reviews.length > 0 ? (
            <div className="detail-section" style={{ border: 'none' }}>
              <h3>Reviews</h3>
              <div className="review-summary">
                <span>★</span>
                <b>{stay.ratingAvg?.toFixed(2)}</b>
                <span>· {reviews.length} reviews</span>
              </div>
              <div className="review-list">
                {reviews.map((r) => (
                  <div key={r.id} className="review-card">
                    <div className="review-card-head">
                      <div className="avatar">{r.authorName.charAt(0).toUpperCase()}</div>
                      <div>
                        <b>{r.authorName}</b>
                        <div className="review-stars">{'★'.repeat(Math.round(r.rating))}</div>
                      </div>
                    </div>
                    <p>{r.text}</p>
                    {r.response ? (
                      <div className="review-response">
                        <b>Response from {stay.hostName || 'the host'}:</b> {r.response}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
>>>>>>> Stashed changes
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
                {hostSince(stay.id)} years hosting
                {stay.instantBook ? ' · Instant Book available' : ''}
                {stay.ratingCount > 0 ? ` · ★ ${stay.ratingAvg?.toFixed(2)}` : ''}
              </p>
              <p className="host-tenure">Identity-verified · typically responds within a few hours</p>
            </div>
          </div>
        </div>

        {/* Booking card */}
        <BookingWidget
          stayId={stay.id}
          priceUSD={stay.priceUSD}
          maxGuests={stay.guests}
          baseGuests={stay.baseGuests || 1}
          instantBook={stay.instantBook}
        />
      </div>

      {similar.length > 0 ? (
        <section className="section">
          <div className="section-head">
            <h2>Similar stays nearby</h2>
          </div>
          <div className="grid">
            {similar.map((s) => (
              <StayCard key={s.id} stay={s} />
            ))}
          </div>
        </section>
      ) : null}

      <Link href="/search" className="back-link">
        ← Back to all stays
      </Link>
    </div>
  );
}
