'use client';

import { useState } from 'react';
import { host } from '@/lib/stayonClient';

const TYPES = ['Villa', 'Apartment', 'House', 'Cottage', 'Cabin', 'Bungalow', 'Homestay', 'Guesthouse'];

export function CreateListingForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [f, setF] = useState({
    title: '', type: 'Villa', city: '', country: 'India', description: '',
    guests: '2', bedrooms: '1', beds: '1', bathrooms: '1',
    priceUSD: '', cleaningFeeUSD: '0', imageUrl: '', instantBook: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.title.trim() || !f.city.trim() || !f.priceUSD) {
      setError('Title, city and nightly price are required.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await host.createListing({
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
        images: f.imageUrl.trim() ? [f.imageUrl.trim()] : [],
        instantBook: f.instantBook,
      });
      onCreated();
    } catch (err: any) {
      setError(err?.message || 'Could not create the listing.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="host-form" onSubmit={submit}>
      <h3>New listing</h3>
      <label className="hf-field">
        <span>Title *</span>
        <input value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="Sunlit loft by the beach" />
      </label>

      <div className="hf-row">
        <label className="hf-field">
          <span>Type</span>
          <select value={f.type} onChange={(e) => set('type', e.target.value)}>
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label className="hf-field">
          <span>City *</span>
          <input value={f.city} onChange={(e) => set('city', e.target.value)} placeholder="Goa" />
        </label>
        <label className="hf-field">
          <span>Country</span>
          <input value={f.country} onChange={(e) => set('country', e.target.value)} />
        </label>
      </div>

      <div className="hf-row">
        <label className="hf-field"><span>Guests</span><input type="number" min={1} value={f.guests} onChange={(e) => set('guests', e.target.value)} /></label>
        <label className="hf-field"><span>Bedrooms</span><input type="number" min={0} value={f.bedrooms} onChange={(e) => set('bedrooms', e.target.value)} /></label>
        <label className="hf-field"><span>Beds</span><input type="number" min={0} value={f.beds} onChange={(e) => set('beds', e.target.value)} /></label>
        <label className="hf-field"><span>Bathrooms</span><input type="number" min={0} value={f.bathrooms} onChange={(e) => set('bathrooms', e.target.value)} /></label>
      </div>

      <div className="hf-row">
        <label className="hf-field"><span>Nightly price (USD) *</span><input type="number" min={1} value={f.priceUSD} onChange={(e) => set('priceUSD', e.target.value)} placeholder="120" /></label>
        <label className="hf-field"><span>Cleaning fee (USD)</span><input type="number" min={0} value={f.cleaningFeeUSD} onChange={(e) => set('cleaningFeeUSD', e.target.value)} /></label>
      </div>

      <label className="hf-field">
        <span>Photo URL</span>
        <input value={f.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} placeholder="https://…  (optional for now)" />
      </label>

      <label className="hf-field">
        <span>Description</span>
        <textarea rows={3} value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="What makes your place special?" />
      </label>

      <label className="hf-check">
        <input type="checkbox" checked={f.instantBook} onChange={(e) => set('instantBook', e.target.checked)} />
        <span>Instant book (guests book without approval)</span>
      </label>

      <p className="hf-note">Prices are in USD; guests see them in their own currency. Your listing goes live immediately — 0% commission.</p>
      {error && <p className="modal-error">{error}</p>}

      <div className="hf-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Publishing…' : 'Publish listing'}</button>
      </div>
    </form>
  );
}
