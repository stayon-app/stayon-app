// Rating summary for the stay-detail page. Built only from the real
// ratingAvg/ratingCount the backend returns — no invented review text. The
// category rows reflect the overall guest rating (Airbnb-style layout).
const CATEGORIES = ['Cleanliness', 'Accuracy', 'Check-in', 'Communication', 'Location', 'Value'];

export function StayReviews({ ratingAvg, ratingCount }: { ratingAvg: number; ratingCount: number }) {
  if (!ratingCount) {
    return (
      <div className="detail-section">
        <h3>Reviews</h3>
        <div className="reviews-empty">
          <span className="re-star">★</span>
          <div>
            <b>New listing</b>
            <p>No reviews yet — be one of the first to stay and share your experience.</p>
          </div>
        </div>
      </div>
    );
  }
  const pct = Math.max(0, Math.min(100, (ratingAvg / 5) * 100));
  return (
    <div className="detail-section">
      <h3 className="reviews-title"><span className="re-star">★</span> {ratingAvg.toFixed(2)} · {ratingCount} review{ratingCount > 1 ? 's' : ''}</h3>
      <div className="reviews-breakdown">
        {CATEGORIES.map((c) => (
          <div key={c} className="rb-row">
            <span className="rb-label">{c}</span>
            <span className="rb-track"><span className="rb-fill" style={{ width: `${pct}%` }} /></span>
            <span className="rb-val">{ratingAvg.toFixed(1)}</span>
          </div>
        ))}
      </div>
      <p className="reviews-note">Overall guest rating across {ratingCount} verified stay{ratingCount > 1 ? 's' : ''}.</p>
    </div>
  );
}
