// Optional real-LLM upgrade path for StayBot.
//
// By default StayBot runs on the fully-local NLU engine (stayBotEngine.ts) — no
// key, works offline, deterministic. If a Claude API key is configured, StayBot
// uses Claude for the *wording* of replies (true open-ended English), while the
// local recommender still supplies the actual bookable stay cards.
//
// The key can come from (in priority order):
//   1. A key the user pastes in-app  (AsyncStorage — best for testing on web)
//   2. EXPO_PUBLIC_ANTHROPIC_API_KEY (build-time env)
//
// ⚠️ SECURITY: a key on the client is shipped to the device/browser and is NOT
// secure for production. For a real launch, proxy this through your own backend
// and call THAT from the app. This client path is for prototyping/testing only.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { BotContext, recommend } from './stayBotEngine';
import { BotStay } from '../data/stays';

const KEY_STORAGE = '@stayon_ai_key';
const MODEL = 'claude-haiku-4-5-20251001';

let runtimeKey: string | null = null;

/** Load any saved key from storage into memory (call once on app/screen mount). */
export async function loadApiKey(): Promise<void> {
  try {
    const k = await AsyncStorage.getItem(KEY_STORAGE);
    if (k) runtimeKey = k;
  } catch { /* ignore */ }
}

export async function setApiKey(key: string): Promise<void> {
  runtimeKey = key.trim() || null;
  try {
    if (runtimeKey) await AsyncStorage.setItem(KEY_STORAGE, runtimeKey);
    else await AsyncStorage.removeItem(KEY_STORAGE);
  } catch { /* ignore */ }
}

export function getApiKey(): string | null {
  return runtimeKey || (process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? null);
}

export function isLLMEnabled(): boolean {
  const k = getApiKey();
  return !!(k && k.length > 10);
}

const SYSTEM_PROMPT =
  'You are StayBot, a warm, professional travel concierge for the StayOn app — think the courtesy and care of an airline cabin-crew member. ' +
  'Keep replies short (1–3 sentences), friendly, specific and helpful. Currency is USD; destinations are USA, UK and Europe only. ' +
  'When the traveller asks for stays, acknowledge their request and note that you are showing matching options below (the app renders real stay cards separately — never invent specific listing names or prices yourself). ' +
  'If the traveller is unhappy or something went wrong, apologise sincerely and offer to help. Be concise and human.';

export interface ChatTurn { role: 'user' | 'assistant'; content: string; }

/**
 * Ask Claude to phrase a reply given the conversation. Returns null on any
 * failure (no key, network/CORS, bad response) so the caller falls back to the
 * local engine wording.
 */
export async function getLLMReplyText(history: ChatTurn[], ctx: BotContext): Promise<string | null> {
  const key = getApiKey();
  if (!key || key.length < 10) return null;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        // Allow direct browser calls (web preview). Still not production-safe.
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 256,
        system:
          `${SYSTEM_PROMPT}\nKnown traveller preferences so far: ` +
          `${JSON.stringify({ destination: ctx.destination, maxPrice: ctx.maxPrice, minPrice: ctx.minPrice, guests: ctx.guests, vibes: ctx.vibes })}.`,
        messages: history.slice(-10).map((m) => ({ role: m.role, content: m.content })),
      }),
    });
    if (!res.ok) return null;
    const j: any = await res.json();
    const text = j?.content?.[0]?.text;
    return typeof text === 'string' && text.trim() ? text.trim() : null;
  } catch {
    return null;
  }
}

// ── Host assistant (advisory) ───────────────────────────────────────────────
// Same key + Smart-mode toggle as the guest StayBot, but a host-advisor persona:
// it phrases replies about the host's own numbers and how StayOn hosting works.
// It NEVER acts — only explains and points to where in the app to make changes.

const HOST_SYSTEM =
  'You are StayOn’s Hosting Assistant — a warm, sharp advisor for a property host. ' +
  'You ONLY explain and suggest; you NEVER take actions (no accepting bookings, changing prices or payouts, or messaging guests). Always tell the host where in the app to make a change themselves. ' +
  'Keep replies short (1–3 sentences), concrete and encouraging. StayOn charges hosts 0% commission — they keep 100% of the rate plus the cleaning fee; taxes pass through. ' +
  'Use the host’s own numbers when relevant. You can explain: creating a listing, Smart Pricing, calendar & availability, house rules, cancellation policy, reviews, StayReels/vlogs, listing guidebooks, the public profile, payouts and the operations-verified payout-change flow, safety, guest messaging, Instant Book, getting more bookings, taxes and identity verification.';

/**
 * Phrase a host-assistant reply with Claude, given the chat history and a short
 * summary of the host's current numbers. Returns null on any failure so the
 * caller falls back to the local advisory engine.
 */
export async function getHostLLMReply(history: ChatTurn[], statsSummary: string): Promise<string | null> {
  const key = getApiKey();
  if (!key || key.length < 10) return null;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        system: `${HOST_SYSTEM}\nThe host’s current numbers: ${statsSummary}`,
        messages: history.slice(-10).map((m) => ({ role: m.role, content: m.content })),
      }),
    });
    if (!res.ok) return null;
    const j: any = await res.json();
    const text = j?.content?.[0]?.text;
    return typeof text === 'string' && text.trim() ? text.trim() : null;
  } catch {
    return null;
  }
}

// ── Agentic mode (Claude tool-use over the real stay catalog) ───────────────
// This is the "real agent" path: Claude reads the conversation, decides when to
// search, calls the `search_stays` tool with the criteria it inferred, we run
// the local recommender on the REAL catalog, hand the results back, and Claude
// replies conversationally about them. It searches, filters, suggests and
// guides like a human concierge — never inventing listings.

export interface AgentReply {
  text: string;
  stays: BotStay[]; // the stays the agent chose to show (from its tool call)
}

const AGENT_SYSTEM =
  'You are StayBot, StayOn’s AI travel concierge — warm, professional, and proactive, like a five-star front-desk agent. ' +
  'You help travellers find and book stays across the USA, UK and Europe. Currency is USD. ' +
  'Use the search_stays tool whenever the traveller is looking for a place, refines their criteria, or asks to see options — infer destination, budget, guests, vibes and amenities from the whole conversation. ' +
  'After a search, talk about the results naturally (e.g. "I found a few beachfront places under $300"), guide the traveller, ask one helpful follow-up if useful, and never invent listing names or prices — only describe what the tool returned. ' +
  'Keep replies concise (1–3 sentences) and friendly. You can also answer questions about StayOn (fees, cancellation, check-in, payments).';

const SEARCH_TOOL = {
  name: 'search_stays',
  description: 'Search StayOn’s catalog of real, bookable stays and return the best matches to show the traveller. Call whenever the traveller wants a place or changes criteria.',
  input_schema: {
    type: 'object',
    properties: {
      destination: { type: 'string', description: 'City or country, e.g. "Miami", "London", "France"' },
      maxPrice: { type: 'number', description: 'Maximum nightly price in USD' },
      minPrice: { type: 'number', description: 'Minimum nightly price in USD' },
      guests: { type: 'number', description: 'Number of guests' },
      vibes: { type: 'array', items: { type: 'string' }, description: 'beach, city, luxury, budget, family, pet, romantic, ski, mountain, wellness, work, lake, nature, adventure' },
      amenities: { type: 'array', items: { type: 'string' }, description: 'pool, hottub, wifi, kitchen, parking, gym, beachfront, ac, fireplace, workspace' },
    },
  },
};

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

function runSearchTool(input: any, ctx: BotContext): BotStay[] {
  const searchCtx: BotContext = {
    destination: input?.destination ?? ctx.destination,
    maxPrice: typeof input?.maxPrice === 'number' ? input.maxPrice : ctx.maxPrice,
    minPrice: typeof input?.minPrice === 'number' ? input.minPrice : ctx.minPrice,
    guests: typeof input?.guests === 'number' ? input.guests : ctx.guests,
    vibes: Array.isArray(input?.vibes) ? input.vibes : [],
    amenities: Array.isArray(input?.amenities) ? input.amenities : [],
    lastSuggestions: [],
    turns: 0,
  };
  return recommend(searchCtx);
}

/**
 * Run StayBot as a tool-using agent. Returns the agent's reply + the stays it
 * chose to display, or null on any failure (caller falls back to local engine).
 */
export async function getLLMAgentReply(history: ChatTurn[], ctx: BotContext): Promise<AgentReply | null> {
  const key = getApiKey();
  if (!key || key.length < 10) return null;
  const headers = {
    'content-type': 'application/json',
    'x-api-key': key,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
  };
  const messages: any[] = history.slice(-10).map((m) => ({ role: m.role, content: m.content }));
  let lastStays: BotStay[] = [];
  try {
    // A few agent turns are enough for search → respond (with optional refine).
    for (let i = 0; i < 4; i++) {
      const res = await fetch(ANTHROPIC_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 512,
          system: `${AGENT_SYSTEM}\nKnown preferences: ${JSON.stringify({ destination: ctx.destination, maxPrice: ctx.maxPrice, minPrice: ctx.minPrice, guests: ctx.guests, vibes: ctx.vibes })}.`,
          tools: [SEARCH_TOOL],
          messages,
        }),
      });
      if (!res.ok) return null;
      const j: any = await res.json();
      const blocks: any[] = Array.isArray(j?.content) ? j.content : [];

      if (j?.stop_reason === 'tool_use') {
        messages.push({ role: 'assistant', content: blocks });
        const toolResults = blocks
          .filter((b) => b.type === 'tool_use' && b.name === 'search_stays')
          .map((b) => {
            const stays = runSearchTool(b.input, ctx);
            lastStays = stays;
            return {
              type: 'tool_result',
              tool_use_id: b.id,
              content: JSON.stringify(
                stays.map((s) => ({ id: s.id, title: s.title, location: s.location, price: s.price, rating: s.rating, type: s.type }))
              ),
            };
          });
        if (!toolResults.length) break;
        messages.push({ role: 'user', content: toolResults });
        continue;
      }

      const text = blocks.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
      return { text: text || 'Here are a few options I found for you:', stays: lastStays };
    }
    return { text: 'Here are a few options I found for you:', stays: lastStays };
  } catch {
    return null;
  }
}
