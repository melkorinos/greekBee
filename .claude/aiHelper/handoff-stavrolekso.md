# Handoff — Stavrolekso (Full Feature: Maker + Game)

**Date:** 2026-05-28  
**Status:** Design complete, implementation not started  
**Supersedes:** `handoff-stavrolekso-maker.md` (maker-only scope — discarded)  
**Next session focus:** Build Stavrolekso end-to-end: pure lib functions, shared grid component, DB table, API routes, maker UI, game landing + player, nav link, admin review tab.

---

## What was decided

All design decisions are committed to:

- **[CONTEXT.md](../../CONTEXT.md)** — `Stavrolekso`, `Stavrolekso Puzzle`, `Edit PIN`, `Slot`, `Οριζόντια`, `Κάθετα`, `community_stavrolekso_puzzles` table, `Game` entry updated to include Stavrolekso, `Session` entry updated to include Stavrolekso's localStorage persistence model
- **[docs/adr/0005-stavrolekso-edit-pin-auth.md](../../docs/adr/0005-stavrolekso-edit-pin-auth.md)** — why creator-chosen PIN over DeviceId or generated token

---

## Architecture decisions (from grilling session)

| Decision | Choice | Reason |
|---|---|---|
| Game shape | Browse landing + individual player | Permanent pool, not daily — players navigate the full approved library |
| Session persistence | `localStorage` keyed by puzzle ID | Consistent with other games; crossword sessions are per-puzzle, not per-day |
| localStorage shape | `{ cells: { "[row]_[col]": letter }, solvedSlots: number[] }` | Cells reconstruct the full grid; solvedSlots avoids re-checking on every render |
| Correct-slot feedback | Auto-check on slot completion | Best crossword UX; normalize input before comparing to stored answer |
| Input navigation | Click → Across, repeat click → Down; auto-advance to next slot on completion | Standard crossword convention |
| Shared grid component | `src/games/stavrolekso/` (not `src/components/shared/`) | Intra-game sharing (maker + player), not cross-game |
| Landing page API | Public `GET /api/community-puzzles/stavrolekso?status=approved` on existing route | Same pattern as other games; auth only required for `status=pending` |
| Empty puzzle title | Show `Stavrolekso #[id]` | Always present, unambiguous |
| Maker link on landing | Visible — "Δημιούργησε το δικό σου σταυρόλεξο" | Community submission is the feature's purpose; nothing to hide |
| Leaderboard | None | Crossword completion is personal; no natural cross-puzzle metric; can revisit later |
| Nav | Add `/stavrolekso` to top nav | Game is fully shippable this session |

---

## Implementation checklist

### 1. DB table (Supabase — run manually)

```sql
create table community_stavrolekso_puzzles (
  id            serial primary key,
  title         text,
  submitter_name text not null default '',
  edit_pin      text not null,
  data          jsonb not null,
  status        text not null default 'pending',
  created_at    timestamptz not null default now()
);
```

`data` shape (slot-based):
```ts
{
  width: number;        // 9, 13, or 15
  height: number;       // same as width (always square)
  blackSquares: [number, number][];
  slots: {
    number: number;
    direction: 'across' | 'down';
    startRow: number;
    startCol: number;
    answer: string;     // uppercase Greek
    clue: string;
  }[];
}
```

### 2. Pure functions — `src/games/stavrolekso/lib/`

Build with `/tdd`. All zero React imports.

- **`autoNumberSlots(width, height, blackSquares)`** → `Slot[]` — standard crossword numbering (top-left to bottom-right; number cells that start an Across or Down run of ≥3)
- **`isConnected(width, height, blackSquares)`** → `boolean` — flood-fill from any white cell; true if all white cells reachable
- **`normalizeAndCompare(input: string, answer: string)`** → `boolean` — strip accents, uppercase, compare; used for auto-check on slot completion

Also place types here: `StavroleksoPuzzleData`, `SlotDef`, `Direction`.

### 3. Shared grid component — `src/games/stavrolekso/`

`StavroleksoGrid` — pure render layer, no internal state. Props:

```ts
interface StavroleksoGridProps {
  width: number;
  height: number;
  blackSquares: [number, number][];
  slots: SlotDef[];
  cellValues: Record<string, string>;       // "[row]_[col]" → letter
  selectedSlot?: { number: number; direction: Direction };
  solvedSlots?: number[];                   // slot numbers already correct
  mode: 'maker' | 'play';
  onCellClick?: (row: number, col: number) => void;
}
```

In `maker` mode: cells are editable, black-square toggle is active.  
In `play` mode: black squares are fixed, correct slots shown in green.

### 4. API routes

Follow exact pattern of `src/app/api/community-puzzles/leksindeseis/`.

| Method | Route | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/community-puzzles/stavrolekso` | none | Submit new puzzle |
| `GET` | `/api/community-puzzles/stavrolekso?status=approved` | none | Public approved list (landing page) |
| `GET` | `/api/community-puzzles/stavrolekso?status=pending` | `X-Admin-Secret` | Admin list |
| `PATCH` | `/api/community-puzzles/stavrolekso/[id]/review` | `X-Admin-Secret` | Approve or reject |
| `PATCH` | `/api/community-puzzles/stavrolekso/[id]` | PIN in body | Creator edit (pending only) |

POST response: `{ ok: true, id: number }`.  
Creator edit body: `{ edit_pin, data, title?, submitter_name? }` — rejects if not pending or PIN mismatch.

### 5. Maker UI — `src/app/stavrolekso/maker/page.tsx`

#### Phase 1 — Grid setup
- Size picker: 9×9 / 13×13 / 15×15
- Optional title field
- Optional submitter name field
- Edit PIN field (required, 4–8 alphanumeric) + "Generate random" button

#### Phase 2 — Grid design
- Render `<StavroleksoGrid mode="maker">`
- Click white cell → toggle black
- No auto-symmetry
- Auto-numbering updates live via `autoNumberSlots()`
- Live connectivity warning (red) via `isConnected()`

#### Phase 3 — Fill & clue
- Click numbered cell → select Across slot; repeat → Down
- Type letters into slot cells
- Clue input in sidebar; letter count appended in UI (derived, not stored)
- Soft word-list warning: unknown words highlighted yellow (against `words-el.json`; 3-letter gap known — warn, never block)

**Hard submit blocks:**
- All white cells must have a letter
- No slot shorter than 3 letters
- At least one Οριζόντια and one Κάθετα slot
- White cells fully connected
- Edit PIN provided

**Submission confirmation screen:**
- Puzzle ID (large, copyable)
- Edit PIN (large, copyable)
- Submitter name (if given)
- Note: pending admin review

#### Resume editing form
- Two fields: puzzle ID + PIN → loads puzzle for editing
- Edit locked if status ≠ `pending`

### 6. Game landing — `src/app/stavrolekso/page.tsx`

- Fetches `GET /api/community-puzzles/stavrolekso?status=approved` at render time
- Lists puzzles newest-first
- Card shows: title (or `Stavrolekso #[id]`), grid size, submission date
- Empty state: "Δεν υπάρχουν διαθέσιμα παζλ ακόμα."
- Visible link to maker: "Δημιούργησε το δικό σου σταυρόλεξο →"
- Clicking a card navigates to `/stavrolekso/[id]`

### 7. Game player — `src/app/stavrolekso/[id]/page.tsx`

- Server fetches puzzle by ID; 404 if not found or not approved
- Client renders `<StavroleksoGrid mode="play">`
- Session stored in `localStorage["stavrolekso-[id]"]` as `{ cells, solvedSlots }`
- Input: click cell → selects Across slot; repeat → Down; typing fills cells left-to-right
- On slot completion: auto-check via `normalizeAndCompare()`; if correct → add to `solvedSlots`, show green
- Auto-advance to next numbered slot on completion
- No leaderboard, no scoring
- Across / Down clue panels showing current slot's clue

### 8. Admin review — Leksikastirio new tab

File: `src/app/leksikastirio/page.tsx`

Add `"stavrolekso"` to the `CommunityTab` union type. Tab label: "Παζλ Stavrolekso".

Card shows:
- Submitter name + submission date
- Title (if any)
- Grid size
- Raw JSON data (`<pre>` block) — no rendered grid for admin review
- Approve / Reject buttons (same pattern as other tabs)

### 9. Nav link

Add `/stavrolekso` to top nav alongside other games.

---

## Suggested build order

1. Pure lib functions (TDD) — `autoNumberSlots`, `isConnected`, `normalizeAndCompare`
2. DB table (manual Supabase)
3. API routes
4. `StavroleksoGrid` base component
5. Maker UI (uses grid in maker mode)
6. Admin review tab (unblocks having approved puzzles)
7. Game landing + player (uses grid in play mode)
8. Nav link

---

## Out of scope

- Leaderboard / scoring — can revisit in a future session
- Browse filtering (by size, solved status) — to be grilled separately
- Admin take-down of approved puzzles — handle via direct DB delete; no UI needed

---

## Key constraints (from CLAUDE.md)

- `npm run test -- --run`, `npx eslint .`, `npm run build` must all pass after every meaningful change
- Game logic in `src/games/stavrolekso/lib/` must be pure functions (zero React imports)
- No new root folders without consulting the user
- No new dependencies without explicit approval
