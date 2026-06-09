import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------------------------------------------------------------------------
// Shared "wallet" of saved cards.
// This module is the single source of truth for saved cards so that the
// Payment Methods screen and the Booking (checkout) screen never diverge.
// Frontend-only: card data is mock/local, persisted via AsyncStorage. USD only.
// ---------------------------------------------------------------------------

export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'chase' | 'discover';

export interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  expiry: string;
  holderName?: string;
  isDefault: boolean;
}

export const STORAGE_KEY = '@stayon_cards';

// Default seed wallet used when storage is empty.
const SEED_CARDS: SavedCard[] = [
  { id: 'seed-visa-4242', brand: 'visa', last4: '4242', expiry: '08/27', holderName: 'Card Holder', isDefault: true },
  { id: 'seed-mc-8210', brand: 'mastercard', last4: '8210', expiry: '03/26', holderName: 'Card Holder', isDefault: false },
];

// Detect card brand from the leading digits (Visa = 4, Mastercard = 5,
// Amex = 34/37 → leading 3, Discover = 6).
export type DetectedBrand = CardBrand | null;
export function detectBrand(digits: string): DetectedBrand {
  if (!digits) return null;
  if (digits[0] === '4') return 'visa';
  if (digits[0] === '5') return 'mastercard';
  if (digits[0] === '3') return 'amex';
  if (digits[0] === '6') return 'discover';
  return null;
}

// Group a raw digit string into blocks of 4 → "1234 5678 9012 3456"
export function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

// --- Persistence helpers ----------------------------------------------------

// Ensure exactly one card carries isDefault (the first one if none/many do).
function normalizeDefault(cards: SavedCard[]): SavedCard[] {
  if (cards.length === 0) return cards;
  const hasDefault = cards.some((c) => c.isDefault);
  let assigned = false;
  return cards.map((c) => {
    const shouldBeDefault = hasDefault ? c.isDefault && !assigned : !assigned;
    if (shouldBeDefault) assigned = true;
    return { ...c, isDefault: shouldBeDefault };
  });
}

export async function getCards(): Promise<SavedCard[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SavedCard[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // fall through to seeding
  }
  // Seed the wallet on first run.
  await saveCards(SEED_CARDS);
  return SEED_CARDS;
}

export async function saveCards(cards: SavedCard[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  } catch {
    // best-effort persistence
  }
}

export async function addCard(card: Omit<SavedCard, 'id'> & { id?: string }): Promise<SavedCard[]> {
  const cards = await getCards();
  const newCard: SavedCard = {
    ...card,
    id: card.id ?? Date.now().toString(),
    // First card in an empty wallet becomes default automatically.
    isDefault: card.isDefault || cards.length === 0,
  };
  // If the new card claims default, clear it on the others.
  const next = newCard.isDefault
    ? cards.map((c) => ({ ...c, isDefault: false })).concat(newCard)
    : cards.concat(newCard);
  const normalized = normalizeDefault(next);
  await saveCards(normalized);
  return normalized;
}

export async function removeCard(id: string): Promise<SavedCard[]> {
  const cards = await getCards();
  const next = normalizeDefault(cards.filter((c) => c.id !== id));
  await saveCards(next);
  return next;
}

export async function setDefaultCard(id: string): Promise<SavedCard[]> {
  const cards = await getCards();
  const next = cards.map((c) => ({ ...c, isDefault: c.id === id }));
  await saveCards(next);
  return next;
}
