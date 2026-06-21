import React, { useState } from 'react';
import { useApp } from './store';
import { Icon, Rating, GradientButton } from './ui';
import { stayById, hostListingToStay, AMENITY_ICON, hiRes } from './data';

export function StayScreen() {
  const { route, navigate, user, isVerified, setPending, setDraft, favs, toggleFav, showToast, money, hostListings } = useApp();
  const id = route.params?.id || '';
  // Seed/generated stays first; otherwise a host's published listing (real captured data).
  const hl = hostListings.find((l) => l.id === id);
  const stay = stayById(id) || (hl ? hostListingToStay(hl) : undefined);
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
    // Booking requires a verified identity — send unverified/guests through auth first.
    if (!user || !isVerified) { setPending({ name: 'book', params: { id: stay.id } }); navigate('auth'); return; }
    navigate('book', { id: stay.id });
  };

  const amenities = showAllAmenities ? stay.amenities : stay.amenities.slice(0, 6);

  // Derived detail (the demo Stay seeds don't carry these explicitly) — mirrors the user app.
  const checkInTime = '3:00 PM';
  const checkOutTime = '11:00 AM';
  const BED_LABELS = ['1 king bed', '1 queen bed', '1 double bed', '2 single beds', '1 sofa bed'];
  const bedroomCards = Array.from({ length: Math.max(1, stay.bedrooms) }, (_, i) => ({
    name: `Bedroom ${i + 1}`,
    bed: BED_LABELS[i % BED_LABELS.length],
    img: stay.images[(i + 1) % stay.images.length],
  }));
  const REVIEW_CATS = ['Cleanliness', 'Accuracy', 'Check-in', 'Communication', 'Location', 'Value'];
  const catScore = (i: number) => Math.min(5, Math.max(4.5, stay.rating + ((i % 3) - 1) * 0.1)).toFixed(1);

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
          <div className="gallery-main"><img src={hiRes(stay.images[0], 3840)} alt={stay.title} /></div>
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
            {stay.reviews > 0 ? (
              <><Rating value={stay.rating} /> <span className="dot">·</span>
              <span className="link-u">{stay.reviews} reviews</span> <span className="dot">·</span></>
            ) : (
              <><span><Icon name="sparkle" size={13} /> New listing</span> <span className="dot">·</span></>
            )}
            <span><Icon name="pin" size={13} /> {stay.location}</span>
          </div>

          {/* highlight band */}
          <div className="stay-band">
            <div className="band-cell"><b>{stay.type}</b><span>{stay.maxGuests} guests · {stay.bedrooms} bedrooms · {stay.beds} beds · {stay.baths} baths</span></div>
            {stay.guestFavourite && <div className="band-cell mid"><span className="band-leaf"><Icon name="sparkle" size={20} color="#0D9488" /></span><b>Guest favourite</b><span>One of the most loved homes on StayOn</span></div>}
          </div>

          {/* Trust pills — mirrors the user app */}
          <div className="stay-trust">
            <span className="trust-pill"><Icon name="shield" size={15} /> Verified stay</span>
            <span className="trust-pill"><Icon name="camera" size={15} /> Verified photos</span>
            {stay.host.superhost && <span className="trust-pill"><Icon name="star" size={15} fill /> Superhost</span>}
            {stay.host.verified && <span className="trust-pill"><Icon name="check" size={15} /> Verified host</span>}
          </div>

          {/* Host */}
          <div className="stay-section host-row">
            <span className="host-av-wrap">
              <img className="host-av" src={stay.host.avatar} alt={stay.host.name} loading="lazy" />
              {stay.host.verified && <span className="host-verified" title="Identity verified"><Icon name="check" size={11} /></span>}
            </span>
            <div>
              <div className="host-name">Hosted by {stay.host.name} {stay.host.superhost && <span className="superhost-tag"><Icon name="star" size={11} fill /> Superhost</span>}</div>
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

          {/* Where you'll sleep */}
          <div className="stay-section">
            <h2 className="stay-h2">Where you'll sleep</h2>
            <div className="sleep-grid">
              {bedroomCards.map((b) => (
                <div key={b.name} className="sleep-card">
                  <div className="sleep-media"><img src={b.img} alt={b.name} loading="lazy" /></div>
                  <b>{b.name}</b>
                  <span>{b.bed}</span>
                </div>
              ))}
            </div>
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
            {stay.reviews > 0 ? (
              <h2 className="stay-h2"><Icon name="star" size={18} fill color="#F59E0B" /> {stay.rating.toFixed(2)} · {stay.reviews} reviews</h2>
            ) : (
              <h2 className="stay-h2"><Icon name="star" size={18} /> New listing</h2>
            )}
            {stay.reviews === 0 ? (
              <p className="muted" style={{ marginTop: 6 }}>No reviews yet — be the first to stay and review this place.</p>
            ) : (<>
            <div className="review-cats">
              {REVIEW_CATS.map((c, i) => (
                <div key={c} className="review-cat"><span>{c}</span><b>{catScore(i)}</b></div>
              ))}
            </div>
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
            </>)}
          </div>

          {/* Host card */}
          <div className="stay-section">
            <h2 className="stay-h2">Meet your host</h2>
            <div className="host-card">
              <div className="host-card-top">
                <span className="host-av-wrap lg">
                  <img className="host-av lg" src={stay.host.avatar} alt={stay.host.name} loading="lazy" />
                  {stay.host.verified && <span className="host-verified lg" title="Identity verified"><Icon name="check" size={13} /></span>}
                </span>
                <div>
                  <div className="host-name lg">{stay.host.name} {stay.host.superhost && <span className="superhost-tag"><Icon name="star" size={11} fill /> Superhost</span>}</div>
                  <p className="host-bio">{stay.host.bio}</p>
                </div>
              </div>

              {/* Stats row — Reviews · Rating · Years hosting */}
              <div className="host-stats">
                <div className="host-stat"><b>{stay.reviews}</b><span>Reviews</span></div>
                <div className="host-stat"><b>{stay.rating.toFixed(2)}<Icon name="star" size={13} fill color="#0D9488" /></b><span>Rating</span></div>
                <div className="host-stat"><b>{2026 - stay.host.since}</b><span>Years hosting</span></div>
              </div>

              {/* Host details */}
              <div className="host-detail"><Icon name="briefcase" size={16} /> My work: {stay.host.work}</div>
              <div className="host-detail"><Icon name="msg" size={16} /> Speaks {stay.host.languages.join(', ')}</div>
              <div className="host-detail"><Icon name="clock" size={16} /> Response rate: {stay.host.responseRate}% · Responds {stay.host.responseTime}</div>

              {stay.host.superhost && (
                <div className="superhost-callout">
                  <b>{stay.host.name.split(' ')[0]} is a Superhost</b>
                  <span>Superhosts are experienced, highly rated hosts who are committed to providing great stays for guests.</span>
                </div>
              )}

              <button className="btn-outline sm" onClick={() => showToast('Messaging will be available after you book')}><Icon name="msg" size={15} /> Message host</button>
              <div className="protect"><Icon name="shield" size={16} /> To help protect your payment, always use StayOn to send money and communicate with hosts.</div>
            </div>
          </div>

          {/* Things to know */}
          <div className="stay-section">
            <h2 className="stay-h2">Things to know</h2>
            <div className="ttk-grid">
              <div className="ttk-col">
                <span className="ttk-ico"><Icon name="cal" size={20} /></span>
                <b>Cancellation policy</b>
                <p>Free cancellation before check-in. Cancel before the stay for a partial refund. Review the host's full policy for details.</p>
              </div>
              <div className="ttk-col">
                <span className="ttk-ico"><Icon name="key" size={20} /></span>
                <b>House rules</b>
                <p>Check-in after {checkInTime}<br />Checkout before {checkOutTime}<br />{stay.maxGuests} guests maximum</p>
              </div>
              <div className="ttk-col">
                <span className="ttk-ico"><Icon name="shield" size={20} /></span>
                <b>Safety &amp; property</b>
                <p>Smoke alarm<br />Carbon monoxide alarm<br />Exterior security camera on property</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky reserve panel */}
        <aside className="stay-aside">
          <div className="reserve-card">
            <div className="reserve-price"><b>{money(stay.price)}</b> <span className="muted">night</span>
              <span className="reserve-rating"><Icon name="star" size={13} fill color="#F59E0B" /> {stay.reviews > 0 ? `${stay.rating.toFixed(2)} · ${stay.reviews}` : 'New'}</span>
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
          <div className="reserve-free"><Icon name="tag" size={15} /> Prices include all fees · StayOn charges 0%</div>
        </aside>
      </div>

      {/* Breadcrumb */}
      <div className="wrap stay-crumb">
        <button onClick={() => navigate('home')}>StayOn</button>
        <Icon name="chevR" size={13} />
        <button onClick={() => navigate('explore', { q: stay.country })}>{stay.country}</button>
        <Icon name="chevR" size={13} />
        <button onClick={() => navigate('explore', { q: stay.city })}>{stay.city}</button>
        <Icon name="chevR" size={13} />
        <span>{stay.title}</span>
      </div>

      {/* Mobile sticky bar */}
      <div className="stay-mobilebar">
        <div><b>{money(stay.price)}</b> <span className="muted">night</span><div className="muted sm"><Icon name="star" size={11} fill color="#F59E0B" /> {stay.reviews > 0 ? stay.rating.toFixed(2) : 'New'}</div></div>
        <GradientButton icon="bolt" onClick={reserve}>{stay.instantBook ? 'Reserve' : 'Request'}</GradientButton>
      </div>

      {gallery && (
        <div className="lightbox" onClick={() => setGallery(false)}>
          <button className="lightbox-close"><Icon name="close" size={22} /></button>
          <div className="lightbox-grid" onClick={(e) => e.stopPropagation()}>
            {stay.images.map((im, i) => <img key={i} src={hiRes(im, 3840)} alt="" loading="lazy" />)}
          </div>
        </div>
      )}
    </div>
  );
}
