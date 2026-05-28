# Handoff — Stavrolekso Maker (Community Crossword Creator)

**Date:** 2026-05-28  
**Status:** Design complete, implementation not started  
**Next session focus:** Build the Stavrolekso maker — DB table, API routes, maker UI at `/stavrolekso/maker`, and admin review tab in Leksikastirio.

---

## What was decided

All design decisions were resolved via `/grill-with-docs`. The canonical terms and DB schema are already committed to:

- **[CONTEXT.md](../../CONTEXT.md)** — `Stavrolekso`, `Stavrolekso Puzzle`, `Edit PIN`, `Slot`, `Οριζόντια`, `Κάθετα`, `community_stavrolekso_puzzles` table entry
- **[docs/adr/0005-stavrolekso-edit-pin-auth.md](../../docs/adr/0005-stavrolekso-edit-pin-auth.md)** — why creator-chosen PIN over DeviceId or generated token

---

## What to build — implementation checklist

### 1. DB table (Supabase)

Create `community_stavrolekso_puzzles`:

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
  width: number;       // 9, 13, or 15
  height: number;      // same as width (always square)
  blackSquares: [number, number][];   // [row, col]
  slots: {
    number: number;
    direction: 'across' | 'down';
    startRow: number;
    startCol: number;
    answer: string;    // uppercase Greek, full slot length
    clue: string;      // plain text
  }[];
}
```

### 2. API routes

Follow the exact pattern of `src/app/api/community-puzzles/leksindeseis/`:

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| `POST` | `/api/community-puzzles/stavrolekso` | none | Submit new puzzle |
| `GET` | `/api/community-puzzles/stavrolekso?status=pending` | `X-Admin-Secret` header | Admin list |
| `PATCH` | `/api/community-puzzles/stavrolekso/[id]/review` | `X-Admin-Secret` header | Approve (`status='approved'`) or reject (DELETE) |
| `PATCH` | `/api/community-puzzles/stavrolekso/[id]` | PIN in body | Creator edit (only while `status='pending'`) |

The creator edit endpoint verifies `{ edit_pin, data, title?, submitter_name? }` — rejects if status is not `pending` or PIN doesn't match.

POST response must return `{ ok: true, id: number }` so the confirmation screen can show the puzzle ID.

### 3. Maker UI — `/stavrolekso/maker`

Route: `src/app/stavrolekso/maker/page.tsx`  
Linked from: the future Stavrolekso game page (not top-level nav — not built yet; add a placeholder link or leave unlinkable for now)

**Three phases** (creator moves freely between 2 and 3):

#### Phase 1 — Grid setup
- Pick size: 9×9, 13×13, 15×15 (three buttons)
- Optional title field
- Optional submitter name field
- **Edit PIN field** (required, 4–8 alphanumeric chars) + "Generate random" button

#### Phase 2 — Grid design
- Render the grid; click a white cell → toggles black
- No symmetry auto-mirror (user decision Q12)
- Auto-numbering updates live after every change (standard crossword convention: number cells that start a Slot, top-left to bottom-right)
- Live connectivity indicator: red warning if white cells are disconnected

#### Phase 3 — Fill & clue
- Click a numbered cell → select its Slot (Across or Down, cycling on repeated click)
- Type answer letters into selected Slot cells
- Type clue in sidebar text field; letter count auto-appended in UI (not stored — derived from slot length)
- Soft word-list warning: unknown words highlighted yellow (validated against `words-el.json`; note: 3-letter coverage has a known gap — warn but never block)

**Submit validation (hard blocks):**
- All white cells must have a letter
- No Slot shorter than 3 letters
- At least one Οριζόντια and one Κάθετα Slot
- White cells must be fully connected
- Edit PIN provided

**Submission confirmation screen:**
- Puzzle ID (large, copyable)
- Edit PIN (large, copyable)
- Submitter name (if given)
- Note: puzzle is pending admin review

#### Resume editing form
Also on `/stavrolekso/maker` — two fields: puzzle ID + PIN → loads puzzle data for editing. Edit locked if status is not `pending`.

### 4. Admin review — Leksikastirio new tab

File: `src/app/leksikastirio/page.tsx`

Add `"stavrolekso"` to the `CommunityTab` union type. Tab label: "Παζλ Stavrolekso". 

Card shows:
- Submitter name + submission date
- Title (if any)
- Raw JSON data (pre-formatted `<pre>` block) — no rendered grid for now; game UI is out of scope this session
- Soft-warning flag count (how many answers are not in `words-el.json`)
- Approve / Reject buttons (same pattern as other community puzzle tabs)

---

## Out of scope for this session

- The actual Stavrolekso game (player-facing puzzle browser + play experience) — separate grill session planned
- Soft-warning count computation is a nice-to-have; raw JSON is sufficient for admin review
- Admin take-down of approved puzzles — handle via direct DB delete; no UI needed

---

## Key constraints (from CLAUDE.md)

- `npm run test -- --run`, `npx eslint .`, `npm run build` must all pass after every meaningful change
- Game logic in `src/games/*/lib/` must be pure functions (zero React imports)
- No new root folders without consulting the user
- No new dependencies without explicit approval

---

## Suggested skills

- `/tdd` — for building the slot auto-numbering and connectivity-check pure functions in `src/games/stavrolekso/lib/`
- `/diagnose` — if word-list validation behaves unexpectedly with 3-letter words
- `/grill-with-docs` — when ready to design the player-facing game side (browsing approved pool, playing a crossword)
