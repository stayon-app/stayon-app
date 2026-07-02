'use client';

import { useState } from 'react';
import { host } from '@/lib/stayonClient';

const TYPES = ['Villa', 'Apartment', 'House', 'Cottage', 'Cabin', 'Bungalow', 'Homestay', 'Guesthouse'];

/** Read a File into { b64, contentType } for POST /media/upload. */
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

export function CreateListingForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [f, setF] = useState({
    title: '', type: 'Villa', city: '', country: 'India', description: '',
    guests: '2', bedrooms: '1', beds: '1', bathrooms: '1',
    priceUSD: '', cleaningFeeUSD: '0', instantBook: false,
  });
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const set = (k: string, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));

  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    const next = Array.from(files)
      .filter((x) => x.type.startsWith('image/'))
      .map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setPhotos((p) => [...p, ...next].slice(0, 10));
  };
  const removePhoto = (i: number) => setPhotos((p) => p.filter((_, idx) => idx !== i));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.title.trim() || !f.city.trim() || !f.priceUSD) {
      setError('Title, city and nightly price are required.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      // 1) Upload photos → public URLs
      const images: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        setStatus(`Uploading photo ${i + 1} of ${photos.length}…`);
        const { b64, contentType } = await readFile(photos[i].file);
        const { url } = await host.uploadPhoto(b64, contentType);
        images.push(url);
      }
      // 2) Create + submit for review
      setStatus('Submitting for review…');
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
        images,
        instantBook: f.instantBook,
      });
      onCreated();
    } catch (err: any) {
      setError(err?.message || 'Could not create the listing.');
    } finally {
      setBusy(false);
      setStatus('');
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

      <div className="hf-field">
        <span>Photos</span>
        <label className="hf-upload">
          <input type="file" accept="image/*" multiple onChange={(e) => addPhotos(e.target.files)} />
          <span>+ Add photos</span>
        </label>
        {photos.length > 0 && (
          <div className="hf-thumbs">
            {photos.map((p, i) => (
              <div key={i} className="hf-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.preview} alt={`photo ${i + 1}`} />
                <button type="button" onClick={() => removePhoto(i)} aria-label="Remove">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <label className="hf-field">
        <span>Description</span>
        <textarea rows={3} value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="What makes your place special?" />
      </label>

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
      </div>
    </form>
  );
}
