"use client";

// How-to-play modal for Leksoplegma — the word-web.
// All numbers shown here derive from LEKSOPLEGMA in gameRules.ts.
// Deliberately no clock language anywhere: this game has no timer.

import { Modal } from "@/components/shared/Modal";
import { LEKSOPLEGMA } from "@/config/gameRules";

interface Props {
  isOpen:  boolean;
  onClose: () => void;
}

export function HowToPlayModal({ isOpen, onClose }: Props) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      closeLabel="Κλείσιμο"
      cardClassName="max-h-[90vh] overflow-y-auto"
    >
      <h2 className="text-lg font-bold text-foreground mb-1">Πώς να παίξεις</h2>
      <p className="text-xs text-muted mb-4 leading-relaxed">
        Βρες τις {LEKSOPLEGMA.REQUIRED_WORDS} κρυμμένες λέξεις του πλέγματος. Σύρε το
        δάχτυλο πάνω στα γράμματα — προς οποιαδήποτε κατεύθυνση, αλλά μόνο κατά μήκος
        των γραμμών — ή πάτα τα γράμματα ένα-ένα. Μόλις σχηματίσεις μια λέξη,
        καταχωρείται αυτόματα.
      </p>

      <div className="space-y-4 text-sm text-foreground">
        <div className="space-y-1">
          <p className="font-semibold">🕸️ Το πλέγμα μαζεύει</p>
          <p className="text-xs text-muted leading-relaxed">
            Όταν βρίσκεις μια λέξη, τα γράμματα και οι γραμμές που δεν χρειάζονται
            πια εξαφανίζονται. Οι λέξεις βρίσκονται με όποια σειρά θες — το παζλ
            λύνεται πάντα. Δεν υπάρχει ρολόι: με την ησυχία σου.
          </p>
        </div>

        <div className="space-y-1">
          <p className="font-semibold">🎯 Πόντοι</p>
          <p className="text-xs text-muted leading-relaxed">
            Κάθε κρυμμένη λέξη δίνει {LEKSOPLEGMA.POINTS_PER_LETTER} πόντους ανά γράμμα.
            Λάθος ή διπλή λέξη δεν κοστίζει τίποτα.
          </p>
        </div>

      </div>

      <button
        onClick={onClose}
        className="mt-5 w-full py-2.5 rounded-xl bg-inverted text-inverted-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
      >
        Κατάλαβα!
      </button>
    </Modal>
  );
}
