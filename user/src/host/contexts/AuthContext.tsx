// Unified auth: in the single app, host mode shares the SAME auth as guest mode,
// so one phone login covers both booking (guest) and hosting (host) — no second
// login when switching. This re-exports the guest AuthContext.
export { AuthProvider, useAuth } from '../../contexts/AuthContext';
