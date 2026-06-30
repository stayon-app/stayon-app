import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getStay } from '@/lib/api';
import { BookingWidget } from '@/components/BookingWidget';
import type { Metadata } from 'next';

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
  const gallery = images.slice(0, 5);

  return (
    <div className="container">
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

      {/* Gallery */}
      <div className="gallery">
        {gallery.length > 0 ? (
          gallery.map((src, i) => (
            <div key={i} className={i === 0 ? 'g-main' : ''}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`${stay.title} photo ${i + 1}`} />
            </div>
          ))
        ) : (
          <div className="g-main g-empty">No photos yet</div>
        )}
      </div>

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
            <div className="detail-section">
              <h3>What this place offers</h3>
              <ul className="amenity-list">
                {stay.amenities.slice(0, 12).map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          ) : null}
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
