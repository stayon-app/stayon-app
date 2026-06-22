import React, { useState } from 'react';
import { useApp } from './store';
import { Icon, GradientButton, Rating, SectionHeader } from './ui';
import { getPublishedExperiences, getExperience, categoryLabel, EXPERIENCE_CATEGORIES } from './experiences';
import { getPolicy } from './cancellationPolicy';

// ---- Browse all experiences ------------------------------------------------
export function ExperiencesScreen() {
  const { navigate, money } = useApp();
  const [cat, setCat] = useState<string>('all');
  const all = getPublishedExperiences();
  const list = cat === 'all' ? all : all.filter((e) => e.category === cat);

  return (
    <main className="wrap">
      <SectionHeader icon="sparkles" title="Experiences" subtitle="Music, comedy, gaming, trips & more — things to do, hosted by locals" />

      <div className="exp-cats">
        <button className={`exp-cat ${cat === 'all' ? 'on' : ''}`} onClick={() => setCat('all')}>All</button>
        {EXPERIENCE_CATEGORIES.map((c) => (
          <button key={c.id} className={`exp-cat ${cat === c.id ? 'on' : ''}`} onClick={() => setCat(c.id)}>{c.label}</button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="empty"><div className="empty-ico"><Icon name="sparkles" size={42} /></div><h3>No experiences here yet</h3></div>
      ) : (
        <div className="exp-grid">
          {list.map((e) => (
            <button key={e.id} className="exp-card" onClick={() => navigate('experience', { id: e.id })}>
              <div className="exp-card-img" style={{ backgroundImage: `url(${e.images[0]})` }}>
                <span className="exp-card-cat">{categoryLabel(e.category)}</span>
              </div>
              <div className="exp-card-body">
                <h4>{e.title}</h4>
                <p className="exp-card-loc"><Icon name="pin" size={13} /> {e.location}</p>
                <div className="exp-card-foot">
                  <span className="exp-card-price">{money(e.pricePerPerson)} <small>/ person</small></span>
                  {e.rating ? <Rating value={e.rating} reviews={e.reviews} /> : null}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}

// ---- Single experience: details + booking ---------------------------------
export function ExperienceScreen() {
  const { route, navigate, money, showToast } = useApp();
  const id = route.params?.id || '';
  const exp = getExperience(id);
  const [people, setPeople] = useState(1);

  if (!exp) return (
    <main className="wrap"><div className="empty"><div className="empty-ico"><Icon name="sparkles" size={42} /></div><h3>Experience not found</h3>
      <button className="btn-outline" onClick={() => navigate('experiences')}>Back to experiences</button></div></main>
  );

  const maxPeople = exp.bookingType === 'individual' ? 1 : Math.max(1, exp.capacity || 1);
  const total = exp.pricePerPerson * people;
  const policy = getPolicy(exp.cancellationPolicy);

  const reserve = () => {
    showToast(`Reserved “${exp.title}” for ${people} ${people === 1 ? 'person' : 'people'} · ${money(total)}`);
    navigate('trips');
  };

  return (
    <main className="wrap exp-detail">
      <button className="back-link" onClick={() => navigate('experiences')}><Icon name="back" size={18} /> Experiences</button>

      <div className="exp-hero" style={{ backgroundImage: `url(${exp.images[0]})` }}>
        <span className="exp-card-cat">{categoryLabel(exp.category)}</span>
      </div>

      <div className="exp-detail-grid">
        <div>
          <h1>{exp.title}</h1>
          <p className="exp-card-loc"><Icon name="pin" size={15} /> {exp.location}{exp.rating ? <> · <Rating value={exp.rating} reviews={exp.reviews} /></> : null}</p>

          <div className="exp-info-strip">
            {exp.dateLabel ? <span><Icon name="cal" size={15} /> {exp.dateLabel}</span> : null}
            {exp.durationLabel ? <span><Icon name="clock" size={15} /> {exp.durationLabel}</span> : null}
            <span><Icon name="users" size={15} /> Up to {exp.capacity}</span>
          </div>

          <h3>About</h3>
          <p className="exp-para">{exp.description}</p>

          {exp.included ? (<><h3>What’s included</h3><p className="exp-para">{exp.included}</p></>) : null}
          {exp.rules ? (<><h3>Rules & guidelines</h3><p className="exp-para">{exp.rules}</p></>) : null}

          <h3>Cancellation policy</h3>
          <p className="exp-para"><b>{policy.tier}.</b> {policy.summary}</p>

          {exp.hostName ? <p className="exp-host"><Icon name="user" size={16} /> Hosted by {exp.hostName}</p> : null}
        </div>

        {/* Booking card */}
        <aside className="exp-book-card">
          <div className="exp-book-price">{money(exp.pricePerPerson)} <small>/ person</small></div>
          <div className="exp-book-people">
            <span>{exp.bookingType === 'individual' ? 'Individual' : exp.bookingType === 'group' ? 'Group' : 'Solo or group'}</span>
            <div className="stepper">
              <button disabled={people <= 1} onClick={() => setPeople((p) => Math.max(1, p - 1))}>−</button>
              <b>{people}</b>
              <button disabled={people >= maxPeople} onClick={() => setPeople((p) => Math.min(maxPeople, p + 1))}>+</button>
            </div>
          </div>
          <div className="exp-book-total"><span>Total</span><b>{money(total)}</b></div>
          <GradientButton full onClick={reserve}>Reserve</GradientButton>
          <p className="exp-book-note">You won’t be charged until payment is enabled.</p>
        </aside>
      </div>
    </main>
  );
}
