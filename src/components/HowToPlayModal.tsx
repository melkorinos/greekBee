"use client";

// HowToPlayModal — shows the game rules in Greek.
// Rendered as a floating modal triggered by the ? button in the header.

import { useState } from "react";

const rules = {
  title: "Πώς να παίξεις",
  items: [
    "Βρες όσες λέξεις μπορείς χρησιμοποιώντας τα 7 γράμματα.",
    "Κάθε λέξη πρέπει να περιέχει το **κεντρικό γράμμα**.",
    "Οι λέξεις πρέπει να έχουν τουλάχιστον **4 γράμματα**.",
    "Τα γράμματα μπορούν να χρησιμοποιηθούν **περισσότερες από μία φορές**.",
    "Το **Πανόραμα** χρησιμοποιεί και τα 7 γράμματα και κερδίζει bonus πόντους.",
    "Οι μεγαλύτερες λέξεις δίνουν περισσότερους πόντους.",
    "Ανέβα στην κατάταξη από Αρχάριος μέχρι Βασίλισσα! 👑",
  ],
};

/** Renders text with **bold** markdown-style markers */
function RuleText({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <span>
      {parts.map((part, i) =>
        i % 2 === 1 ? <strong key={i}>{part}</strong> : part
      )}
    </span>
  );
}

export function HowToPlayModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="How to play"
        className="w-8 h-8 flex items-center justify-center rounded-full border border-stone-300 text-stone-600 text-sm font-bold hover:bg-stone-100 transition-colors"
      >
        ?
      </button>

      {/* Backdrop + modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 text-xl leading-none"
            >
              ✕
            </button>

            <h2 className="text-lg font-bold text-stone-800 mb-3">
              {rules.title}
            </h2>

            <ul className="space-y-2 text-sm text-stone-700">
              {rules.items.map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-yellow-500 mt-0.5">🐝</span>
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
