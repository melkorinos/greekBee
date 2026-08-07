"use client";

// HowToPlayModal — shared rules modal used by all games.
// Each game passes its own title, rules list, and optional bullet icon.

import { useState } from "react";
import { Modal } from "./Modal";
import { GameHelpButton } from "./GameHelpButton";
import { btnModalSubmit } from "@/styles/recipes";

interface HowToPlayModalProps {
  title:        string;
  items:        readonly string[];
  bulletIcon?:  string;
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
}: HowToPlayModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Trigger — this modal owns its own open state (it is rendered by two
          server components), unlike the games that drive theirs from
          GamePageChrome. Same button either way. */}
      <GameHelpButton onClick={() => setOpen(true)} />

      {/* Backdrop + modal */}
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        ariaLabel={title}
        closeLabel="Close"
        cardClassName="overflow-hidden"
      >
        <h2 className="text-lg font-bold text-foreground mb-3">{title}</h2>

        <ul className="space-y-2 text-sm text-foreground overflow-y-auto max-h-[70dvh]">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-0.5 shrink-0">{bulletIcon}</span>
              <RuleText text={item} />
            </li>
          ))}
        </ul>

        <button onClick={() => setOpen(false)} className={`mt-5 w-full ${btnModalSubmit}`}>
          Κατάλαβα!
        </button>
      </Modal>
    </>
  );
}
