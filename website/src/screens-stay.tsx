import React, { useState } from 'react';
import { useApp } from './store';
import { Icon, Rating, GradientButton } from './ui';
import { stayById, AMENITY_ICON } from './data';

export function StayScreen() {
  const { route, navigate, user, setPending, setDraft, favs, toggleFav, showToast, money } = useApp();
  const stay = stayById(route.params?.id || '');
  const [gallery, setGallery] = useState(false);
  const [showAllAmenities, setShowAllAmenities] = useState(false);

  if (!stay) return (
    <main className="wrap"><div className="empty"><div className="empty-ico"><Icon name="home" size={42} /></div><h3>Stay not found</h3>
      <button className="btn-outline" onClick={() => navigate('home')}>Back home</button></div></main>
  );

  const fav = favs.has(stay.id);

  // default dates: in 14 days, 5 nights
  const inDate = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);
  const outDate = new Date(Date.now() + 19 * 86_400_000).toISOString().slice(0, 10);

  const reserve = () => {
    setDraft({ stayId: stay.id, checkIn: inDate, checkOut: outDate, guests: 2 });
    if (!user) { setPending({ name: 'book', params: { id: stay.id } }); navigate('auth'); return; }
    navigate('book', { id: stay.id });
  };

  const amenities = showAllAmenities ? stay.amenities : stay.amenities.slice(0, 6);

  return (
    <div className="stay">
      <div className="wrap stay-top">
        <button className="back" onClick={() => navigate('home')}><Icon name="chevL" size={18} /> Back</button>
        <div className="stay-topbar-actions">
          <button className="link-btn" onClick={() => showToast('Link copied to clipboard')}><Icon name="share" size={16} /> Share</button>
          <button className="link-btn" onClick={() => { toggleFav(stay.id); }}><Icon name="heart" size={16} fill={fav} color={fav ? '#FB7185' : undefined} /> {fav ? 'Saved' : 'Save'}</button>
        </div>
      </div>

      {/* Gallery */}
      <div className="wrap">
        <div className="gallery" onClick={() => setGallery(true)}>
          <div className="gallery-main"><img src={stay.images[0]} alt={stay.title} /></div>
          <div className="gallery-side">
            {stay.images.slice(1, 5).map((im, i) => (
              <div key={i} className="gallery-cell"><img src={im} alt="" />{i === 3 && stay.images.length > 5 && <span className="gallery-more">+{stay.images.length - 5}</span>}</div>
            ))}
          </div>
          <button className="gallery-btn"><Icon name="menu" size={15} /> Show all photos</button>
        </div>
      </div>

      <div className="wrap stay-grid">
        <div className="stay-main">
          <h1 className="stay-title">{stay.title}</h1>
          <div className="stay-subline">
            <Rating value={stay.rating} /> <span className="dot">·</span>
            <span className="link-u">{stay.reviews} reviews</span> <span className="dot">·</span>
            <span><Icon name="pin" size={13} /> {stay.location}</span>
          </div>

          {/* highlight band */}
          <div className="stay-band">
            <div className="band-cell"><b>{stay.type}</b><span>{stay.maxGuests} guests · {stay.bedrooms} bedrooms · {stay.beds} beds · {stay.baths} baths</span></div>
            {stay.guestFavourite && <div className="band-cell mid"><span className="band-leaf"><Icon name="sparkle" size={20} color="#0D9488" /></span><b>Guest favourite</b><span>One of the most loved homes on StayOn</span></div>}
          </div>

          {/* Host */}
          <div className="stay-section host-row">
            <img className="host-av" src={stay.host.avatar} alt={stay.host.name} />
            <div>
              <div className="host-name">Hosted by {stay.host.name} {stay.host.superhost && <span className="superhost-tag">Superhost</span>}</div>
              <div className="muted">Hosting since {stay.host.since} · Responds {stay.host.responseTime}</div>
            </div>
          </div>

          {/* Highlights */}
          <div className="stay-section">
            {stay.highlights.map((h) => (
              <div key={h.title} className="hl-row">
                <span className="hl-ico"><Icon name={h.icon} size={22} /></span>
                <div><b>{h.title}</b><span>{h.desc}</span></div>
              </div>
            ))}
          </div>

          {/* About */}
          <div className="stay-section">
            <h2 className="stay-h2">About this place</h2>
            <p className="stay-desc">{stay.description}</p>
          </div>

          {/* Amenities */}
          <div className="stay-section">
            <h2 className="stay-h2">What this place offers</h2>
            <div className="amenity-grid">
              {amenities.map((a) => (
                <div key={a} className="amenity"><Icon name={AMENITY_ICON[a] || 'check'} size={22} /> {a}</div>
              ))}
            </div>
            {stay.amenities.length > 6 && (
              <button className="btn-outline sm" onClick={() => setShowAllAmenities((v) => !v)}>
                {showAllAmenities ? 'Show less' : `Show all ${stay.amenities.length} amenities`}
              </button>
            )}
          </div>

          {/* Map */}
          <div className="stay-section">
            <h2 className="stay-h2">Where you'll be</h2>
            <div className="map-box">
              <iframe title="map" loading="lazy" src={`https://www.openstreetmap.org/export/embed.html?bbox=${stay.lng - 0.05}%2C${stay.lat - 0.03}%2C${stay.lng + 0.05}%2C${stay.lat + 0.03}&layer=mapnik&marker=${stay.lat}%2C${stay.lng}`} />
            </div>
            <p className="muted map-note"><Icon name="lock" size={13} /> Exact location provided after booking is confirmed.</p>
          </div>

          {/* Reviews */}
          <div className="stay-section">
            <h2 className="stay-h2"><Icon name="star" size={18} fill color="#F59E0B" /> {stay.rating.toFixed(2)} · {stay.reviews} reviews</h2>
            <div className="review-grid">
              {stay.reviewList.map((r, i) => (
                <div key={i} className="review">
                  <div className="review-head">
                    <img src={r.avatar} alt={r.name} />
                    <div><b>{r.name}</b><span className="muted">{r.location}</span></div>
                  </div>
                  <div className="review-stars">{[0, 1, 2, 3, 4].map((i) => <Icon key={i} name="star" size={13} fill color="#F59E0B" />)} <span className="muted">· {r.date}</span></div>
                  <p>{r.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Host card */}
          <div className="stay-section host-card">
            <div className="host-card-top">
              <img className="host-av lg" src={stay.host.avatar} alt={stay.host.name} />
              <div>
                <div className="host-name lg">{stay.host.name} {stay.host.superhost && <span className="superhost-tag">Superhost</span>}</div>
                <div className="muted">{stay.reviews} reviews · {stay.rating.toFixed(2)} rating · {2026 - stay.host.since} years hosting</div>
              </div>
            </div>
            <p className="stay-desc">{stay.host.bio}</p>
            <div className="muted">Response rate: {stay.host.responseRate}% · Responds {stay.host.responseTime}</div>
            <button className="btn-outline sm" onClick={() => showToast('Messaging will be available after you book')}><Icon name="msg" size={15} /> Message host</button>
            <div className="protect"><Icon name="shield" size={16} /> To help protect your payment, always use StayOn to send money and communicate with hosts.</div>
          </div>
        </div>

        {/* Sticky reserve panel */}
        <aside className="stay-aside">
          <div className="reserve-card">
            <div className="reserve-price"><b>{money(stay.price)}</b> <span className="muted">night</span>
              <span className="reserve-rating"><Icon name="star" size={13} fill color="#F59E0B" /> {stay.rating.toFixed(2)} · {stay.reviews}</span>
            </div>
            <div className="reserve-dates">
              <div><label>CHECK-IN</label><div>{new Date(inDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div></div>
              <div><label>CHECKOUT</label><div>{new Date(outDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div></div>
              <div className="reserve-guests"><label>GUESTS</label><div>2 guests</div></div>
            </div>
            <GradientButton full icon="bolt" onClick={reserve}>{stay.instantBook ? 'Reserve' : 'Request to book'}</GradientButton>
            <p className="reserve-note">You won't be charged yet</p>
            <div className="reserve-lines">
              <div><span className="link-u">{money(stay.price)} × 5 nights</span><span>{money(stay.price * 5)}</span></div>
              <div><span className="link-u">Cleaning fee</span><span>{money(Math.round(stay.price * 5 * 0.12))}</span></div>
              <div><span className="link-u">Taxes</span><span>{money(Math.round(stay.price * 5 * 0.08))}</span></div>
              <div className="reserve-total"><b>Total before taxes</b><b>{money(stay.price * 5 + Math.round(stay.price * 5 * 0.12) + Math.round(stay.price * 5 * 0.08))}</b></div>
            </div>
          </div>
          <div className="reserve-free"><Icon name="shield" size={15} /> Free cancellation before check-in</div>
        </aside>
      </div>

      {/* Mobile sticky bar */}
      <div className="stay-mobilebar">
        <div><b>{money(stay.price)}</b> <span className="muted">night</span><div className="muted sm"><Icon name="star" size={11} fill color="#F59E0B" /> {stay.rating.toFixed(2)}</div></div>
        <GradientButton icon="bolt" onClick={reserve}>{stay.instantBook ? 'Reserve' : 'Request'}</GradientButton>
      </div>

      {gallery && (
        <div className="lightbox" onClick={() => setGallery(false)}>
          <button className="lightbox-close"><Icon name="close" size={22} /></button>
          <div className="lightbox-grid" onClick={(e) => e.stopPropagation()}>
            {stay.images.map((im, i) => <img key={i} src={im} alt="" />)}
          </div>
        </div>
      )}
    </div>
  );
}
