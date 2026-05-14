"use client";

// HowToPlayModal — shared rules modal used by all games.
// Each game passes its own title, rules list, and optional bullet icon.

import { useState } from "react";

interface HowToPlayModalProps {
  title:        string;
  items:        string[];
  bulletIcon?:  string;
  /** Use a light-coloured trigger button (for dark-background pages like Wordle) */
  lightTrigger?: boolean;
}

/** Renders text with **bold** markdown-style markers */
function RuleText({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <span>
      {parts.map((part, i) =>
        i % 2 === 1 ? <strong key={i}>{part}</strong> : part,
      )}
    </span>
  );
}

export function HowToPlayModal({
  title,
  items,
  bulletIcon = "▸",
  lightTrigger = false,
}: HowToPlayModalProps) {
  const [open, setOpen] = useState(false);

  const triggerClass = lightTrigger
    ? "w-8 h-8 flex items-center justify-center rounded-full border border-stone-600 text-stone-300 text-sm font-bold hover:bg-stone-700 transition-colors"
    : "w-8 h-8 flex items-center justify-center rounded-full border border-stone-300 text-stone-600 text-sm font-bold hover:bg-stone-100 transition-colors";

  return (
    <>
      {/* Trigger */}
      <div className="relative group">
        <button
          onClick={() => setOpen(true)}
          aria-label="How to play"
          className={triggerClass}
        >
          ?
        </button>
        <div className="pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-stone-800 px-2.5 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity z-10">
          Πώς να παίξεις
        </div>
      </div>

      {/* Backdrop + modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 text-xl leading-none"
            >
              ✕
            </button>

            <h2 className="text-lg font-bold text-stone-800 mb-3">{title}</h2>

            <ul className="space-y-2 text-sm text-stone-700 overflow-y-auto max-h-[70dvh]">
              {items.map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-0.5 shrink-0">{bulletIcon}</span>
                  <RuleText text={item} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
