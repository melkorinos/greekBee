"use client";

// HowToPlayModal — shared rules modal used by all games.
// Each game passes its own title, rules list, and optional bullet icon.

import { useState } from "react";
import { Modal } from "./Modal";
import { btnHeaderIcon, btnHeaderIconSize } from "@/styles/recipes";

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
      {/* Trigger */}
      <div className="relative group">
        <button
          onClick={() => setOpen(true)}
          aria-label="How to play"
          className={`${btnHeaderIconSize} ${btnHeaderIcon} text-sm font-bold`}
        >
          ?
        </button>
        <div className="pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-inverted px-2.5 py-1 text-xs text-inverted-foreground opacity-0 group-hover:opacity-100 transition-opacity z-10">
          Κανόνες
        </div>
      </div>

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
      </Modal>
    </>
  );
}
