"use client";

// Modal — the platform's single modal primitive (ADR 0009).
//
// Owns the parts that define the shared modal "feel": the backdrop, z-index,
// overlay-click-to-close, the card shell (surface, radius, shadow, width), and —
// for the center variant — the corner close button. Callers supply only content,
// so changing the backdrop opacity / radius / animation is a one-place edit.
//
// Variants:
//   center — vertically-centred dialog card (max-w-game). The default.
//   sheet  — full-width bottom sheet with a rounded top (leaderboards). Renders
//            no built-in close button; sheet callers place close in their own
//            header row.
//
// Per-modal height/scroll/layout tweaks go through `cardClassName`
// (e.g. "max-h-[90vh] overflow-y-auto" or "flex flex-col").

import type { ReactNode } from "react";

import { btnHeaderIcon, btnHeaderIconSize } from "@/styles/recipes";

interface ModalProps {
  isOpen:   boolean;
  onClose:  () => void;
  children: ReactNode;
  variant?: "center" | "sheet";
  /** Extra classes merged onto the card (height, scroll, flex layout). */
  cardClassName?: string;
  /** Render the built-in corner close button (center variant only). Default true. */
  showClose?: boolean;
  /** aria-label for the built-in close button. */
  closeLabel?: string;
  /** aria-label for the dialog itself. */
  ariaLabel?: string;
  // Optional test hooks — preserve callers' existing data-testids.
  backdropTestId?: string;
  cardTestId?: string;
  closeTestId?: string;
}

export function Modal({
  isOpen,
  onClose,
  children,
  variant = "center",
  cardClassName = "",
  showClose = true,
  closeLabel = "Κλείσιμο",
  ariaLabel,
  backdropTestId,
  cardTestId,
  closeTestId,
}: ModalProps) {
  if (!isOpen) return null;

  const isSheet = variant === "sheet";

  const backdropClass = isSheet
    ? "fixed inset-0 z-50 flex items-end justify-center bg-black/40"
    : "fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4";

  const cardClass = isSheet
    ? "relative bg-surface rounded-t-card shadow-2xl w-full max-w-game"
    : "relative bg-surface rounded-card shadow-xl w-full max-w-game p-6";

  return (
    <div
      className={backdropClass}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      data-testid={backdropTestId}
    >
      <div
        className={`${cardClass}${cardClassName ? ` ${cardClassName}` : ""}`}
        onClick={(e) => e.stopPropagation()}
        data-testid={cardTestId}
      >
        {showClose && !isSheet && (
          <button
            onClick={onClose}
            aria-label={closeLabel}
            data-testid={closeTestId}
            className={`absolute top-4 right-4 z-10 ${btnHeaderIconSize} ${btnHeaderIcon} text-sm leading-none`}
          >
            ✕
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
