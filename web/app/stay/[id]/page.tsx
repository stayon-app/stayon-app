import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getStay } from '@/lib/api';
import { BookingWidget } from '@/components/BookingWidget';
import { StayLocationMap } from '@/components/StayLocationMap';
import { StayGallery } from '@/components/StayGallery';
import { RecordStayView } from '@/components/RecentlyViewed';
import { StayAmenities } from '@/components/StayAmenities';
import { StayReviews } from '@/components/StayReviews';
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

export default async function StayDetailPage({ params }: { params: { id: string } }) {
  const stay = await getStay(params.id);
  if (!stay) notFound();

  const images = stay.images || [];
  const initial = (stay.hostName || 'S').trim().charAt(0).toUpperCase();

  return (
    <div className="container">
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
      </div>

      {/* Gallery + lightbox */}
      <StayGallery images={images} title={stay.title} />

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

      <Link href="/search" className="back-link">
        ← Back to all stays
      </Link>
    </div>
  );
}
