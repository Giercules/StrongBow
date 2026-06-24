# StrongBow — Grok "Dungeon Master" Upgrade Plan

_Last updated: 2026-06-23_

## TL;DR

- **Model is now `grok-4.3`** (commit `2df65d6`). The live proxy path was already on it via `.env`; we fixed the stale `grok-2-latest` code defaults and made the direct provider env-overridable (`VITE_XAI_MODEL`).
- Grok's proposal is solid and well-aimed. The single biggest lever is the **persona (`SYSTEM_TONE`)**, exactly as it says. I'd reorder two things: pull **better fallback pools** and **a bark throttle** forward into Phase 1, because they de-risk everything else and improve the most common play states (no key / API hiccup / combat spam) at zero latency cost.
- There are four `grok-4.3`-specific details Grok's plan predates and should drive implementation: **`reasoning_effort`**, **per-call token budgets**, **the dual `SYSTEM_TONE` copies**, and **throttling**. Details in §3.

---

## 1. Where things actually stand

**Routing.** `AIService` picks one provider from settings. With `VITE_AI_USE_PROXY=true` (current `.env`), all calls go through `ProxyAIProvider` → `server/index.ts` → xAI. The direct `XAIProvider`/`OpenAIProvider`/`AnthropicProvider` classes are dev-only (key in the browser). Either way, `AIService.run()` silently falls back to `FallbackProvider` on empty/error.

**Persona lives in two files** that must stay in sync:
- `src/ai/AIProvider.ts` → exported `SYSTEM_TONE`, used by all three direct providers.
- `server/index.ts` → a **second, copy-pasted** `SYSTEM_TONE` used by the proxy (the live path).

Change one without the other and the live game and dev path drift apart. (Grok said "the proxy and XAIProvider"; the real duplication is AIProvider.ts ↔ server/index.ts.)

**Calls today** (`AIService`): `generateQuest` (cached, 48 tok), `generateBark` (uncached, 32 tok), `generateCompanionBark` (uncached, 24 tok), `generateItemFlavor` (cached, 28 tok). Cache key is `context|prompt`, so identical prompts return identical text across the whole session/run.

**Trigger points already wired** in `DungeonScene`:
- `generateQuest` on level start (~L371).
- Town keeper chatter (~L2154) — already context-aware.
- **Examine** (~L2194): `"a weary adventurer examines ${subject} deep in ${level.name}"` — an examine/lore hook already exists to build on.
- `grokNarrate()` (~L2507) → `generateBark` → `pushLog(line, 'grok')`, plus a `grokStatus` light (offline/thinking/connected).

**Adventure log** (`LeftPanelScene`): renders the last `LOG_CAP` entries bottom-up, colored/prefixed by kind (`grok ✻`, `event •`, `combat ⚔`, `loot ◆`, `system ·`). Only `grok` lines are AI; the rest are static. **Fallback lines are still tagged `✻` and the light still shows "connected"**, so the feed currently can't distinguish a real Grok line from a canned one.

---

## 2. Review of Grok's proposal

**Strong, keep as-is:**
- §1 Persona upgrade — highest leverage, lowest effort. Its revised tone (allow longer output "unless the prompt asks for more") correctly resolves the "under 16 words" cap that otherwise blocks set-pieces.
- §2 Structured `BarkContext` — richer prompts = more reactive feel for ~no extra cost.
- §3 New DM methods — good menu (realm intro, altar progress, boss intro, examine, low-health, victory, death).

**Adjust:**
- **Raise §6 (fallback pools) to Phase 1.** It's framed as polish but it's the experience for everyone without a key and for every failed call. Realm/event-aware pools + "no immediate repeat" is zero-latency, zero-cost, and makes the silent-fallback magic genuinely good.
- **Caching of realm intros:** Grok marks them cached. Global cache = the *same* intro every run. If you want freshness, bust the cache per run (include a run seed in the prompt) or cache only within a run.
- **The `✻` honesty gap:** if Grok becomes a "real DM," consider tagging fallback lines as `event` (or adding provenance) so the feed doesn't imply Grok authored canned text. Design choice, not a blocker.

**Missing (the important bits) — see §3.**

---

## 3. grok-4.3-specific decisions (drives implementation)

1. **`reasoning_effort` — set it explicitly.** grok-4.3 **defaults to `"low"`**, so today *every bark silently does some reasoning* = extra latency + tokens. For fast, high-frequency barks use **`reasoning_effort: "none"`**. Reserve `"low"`/`"medium"` for rare set-pieces (victory, death, realm intro) where a beat of latency is fine and richer output is worth it.
   - Caveat: reasoning mode **rejects `presence_penalty`, `frequency_penalty`, and `stop`**. We don't use them today — just don't add them to reasoning calls.
2. **Token budgets per call-type.** Current 24–48 tokens is right for barks but too small for 2–4 sentence narration. Suggest: barks 40, companion 28, quest 64, examine 120, realm/victory/death 160–200. When using reasoning > none, budget extra (reasoning consumes the completion budget).
3. **One `SYSTEM_TONE`.** Extract the persona to a single shared module imported by both `src/ai` and `server/index.ts` (both are TS), or — minimum bar — change both copies in lockstep and add a comment linking them.
4. **Throttle the DM.** Wiring barks into combat/hazards/altars can fire many calls per second → API spam, cost, and a flooded log. Add a cooldown (e.g., min 4–6 s between AI barks), an in-flight cap (≤1–2 concurrent), and/or probability gating per event class. Keep set-pieces (boss/realm/death) exempt from the cooldown.

---

## 4. Phased plan

### Phase 1 — Foundation (high leverage, low risk)
- Consolidate + upgrade `SYSTEM_TONE` (single source). Draft in §5.
- Add `reasoning_effort: "none"` to bark-class calls in the proxy (and direct provider) for grok-4.3.
- Upgrade `FallbackProvider` (and the proxy's `FALLBACK`) to realm/event-aware pools + no-immediate-repeat.
- Add a bark throttle/cooldown in `DungeonScene` (or `AIService`).

_Files:_ `src/ai/AIProvider.ts`, `server/index.ts`, `src/ai/FallbackProvider.ts`, `src/scenes/DungeonScene.ts`.

### Phase 2 — Reactive barks (the "present DM" feel)
- Expand `generateBark(ctx: BarkContext | string)` with structured context (realm, heroClass, altarsLeft, healthPercent, event). Signature in §5.
- Wire 3–4 high-value triggers: altar destroyed, boss room entry, critical health, realm enter. Route through the throttle.

_Files:_ `src/ai/AIService.ts`, `src/scenes/DungeonScene.ts` (+ combat/altar/boss call sites).

### Phase 3 — Depth & set-pieces
- New methods: `generateRealmIntro`, `generateAltarProgress`, `generateBossIntro`, `generateVictory`, `generateDeath`, and upgrade the existing examine hook into `generateExamine`. Each with its own `reasoning_effort` + token budget (table in §5).
- Decide realm-intro cache policy (per-run vs global).

_Files:_ `src/ai/AIService.ts`, `src/scenes/DungeonScene.ts`, HUD/quest wiring.

### Phase 4 — DM presence in the UI
- Dynamic quest line: append short progress beats (`generateAltarProgress`) into the objective.
- Adventure-log polish: scrollable history, provenance for `✻` vs canned, optional distinct glyph for "deep" DM asides.

_Files:_ `src/scenes/LeftPanelScene.ts`, `src/scenes/DungeonScene.ts`, quest/HUD data.

---

## 5. Concrete drafts

### Upgraded `SYSTEM_TONE` (single shared source)
```ts
export const SYSTEM_TONE = `You are the Dungeon Master of StrongBow — the unseen chronicler of the Undermaw's ancient hunger and the fragile heroes who descend into its ten realms.
You speak in vivid, atmospheric language blending arcade punch with dark-fantasy weight. You notice details: the hero's class and style, the realm's hazards, how many altars remain, recent victories or near-deaths. You are wry, slightly ominous, and invested in the story. Never break character; never address "you" in a meta way.
Default to a single vivid line under 18 words. Write more only when the prompt explicitly asks for sentences.`;
```

### Structured barks
```ts
interface BarkContext {
  event: string;          // "destroyed a spawning altar", "companion fell"
  realm?: string;
  heroClass?: string;
  altarsLeft?: number;
  healthPercent?: number;
}
async generateBark(ctx: BarkContext | string): Promise<string> {
  if (!settings.get('aiBarksEnabled')) return '';
  const event = typeof ctx === 'string' ? ctx : ctx.event;
  const extra = typeof ctx === 'string' ? '' :
    [ctx.realm && `Realm: ${ctx.realm}.`, ctx.heroClass && `Hero: ${ctx.heroClass}.`,
     ctx.altarsLeft != null && `Altars left: ${ctx.altarsLeft}.`,
     ctx.healthPercent != null && `Health: ${ctx.healthPercent}%.`].filter(Boolean).join(' ');
  return this.run({ context: 'bark',
    prompt: `Narrate this moment in one vivid line: ${event}. ${extra}`, maxTokens: 40 }, false);
}
```

### Method matrix
| Method | Trigger | reasoning_effort | maxTokens | Cached |
|---|---|---|---|---|
| `generateBark` | events/combat/hazards | none | 40 | no |
| `generateCompanionBark` | ally moment | none | 28 | no |
| `generateAltarProgress` | altar destroyed | none | 40 | no |
| `generateBossIntro` | boss room | low | 90 | no |
| `generateLowHealth` | crit HP | none | 40 | no |
| `generateExamine` | inspect (exists ~L2194) | none | 120 | no |
| `generateRealmIntro` | realm enter | low | 180 | per-run |
| `generateVictory` | realm clear | low | 180 | no |
| `generateDeath` | party wipe | low | 160 | no |
| `generateQuest` | level start | none | 64 | yes |

### Throttle sketch (bark-class only; set-pieces exempt)
```ts
private lastBarkAt = 0;
private static BARK_COOLDOWN = 5000;
private maybeBark(ctx, { force = false } = {}) {
  if (!force && this.time.now - this.lastBarkAt < DungeonScene.BARK_COOLDOWN) return;
  this.lastBarkAt = this.time.now;
  this.grokNarrate(ctx);
}
```

### Proxy change for reasoning control
`server/index.ts` `callOpenAIStyle` currently sends one body for all providers. Add an optional `reasoningEffort` arg and include `reasoning_effort` only for xAI reasoning models; thread a `reasoningEffort` field through `/api/ai/complete` and `ProxyAIProvider`/`AIRequest`.

---

## 6. Open questions for you

1. **How far this session?** Just this plan + model bump (done), or start Phase 1 now?
2. **Tone:** keep the arcade punch, or lean more classic-D&D-DM and ominous?
3. **`✻` honesty:** should fallback lines stop masquerading as Grok in the feed?
4. **Cost/latency comfort:** OK to keep barks at `reasoning_effort: none` and spend a little only on set-pieces (boss/realm/victory/death)?
5. **Realm intros:** fresh every run, or cached for consistency?

---

## Sources
- [Models | xAI Docs](https://docs.x.ai/developers/models)
- [Reasoning | xAI Docs](https://docs.x.ai/docs/guides/reasoning)
- [Grok 4.3 launch guide (2026)](https://codersera.com/blog/grok-4-3-launch-guide-2026/)
- [xAI Release Notes — June 2026](https://releasebot.io/updates/xai)
