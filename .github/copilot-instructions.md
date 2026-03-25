# Spelling Bee – Copilot Instructions

## Project Overview
A browser-based Spelling Bee game inspired by the NYT Spelling Bee.
Built with Next.js 15 + TypeScript + Tailwind CSS.

## Rules
- 7 letters in a honeycomb (1 center + 6 outer)
- Every valid word must include the center letter
- Words must be at least 4 letters long
- Letters can be reused
- Pangrams (all 7 letters used) give bonus points
- Points scale with word length; players climb ranks (Beginner → Genius → Queen Bee)

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State**: React `useState` / `useReducer`
- **Persistence**: `localStorage`
- **Word data**: Local JSON files (`words-en.json`, `words-el.json`)
- **Testing**: Vitest + React Testing Library

## Key Design Decisions
- Game logic is pure functions, fully decoupled from UI (easy to unit test)
- Language is a config swap — English and Greek share identical logic
- No external dictionary API for POC; word lists are local JSON arrays
- `localStorage` stores found words, score and today's puzzle state

## Folder Structure (planned)
- `src/components/` – React UI components
- `src/lib/`        – Pure game logic (validation, scoring, ranking)
- `src/data/`       – Word lists and puzzle definitions (JSON)
- `src/types/`      – Shared TypeScript interfaces
- `src/hooks/`      – Custom React hooks (game state, persistence)
