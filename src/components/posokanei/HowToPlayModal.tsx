"use client";

// How-to-play modal for Πόσο κάνει;. Numbers derive from POSOKANEI in
// gameRules.ts. Two credits are license/source obligations, rendered verbatim
// (handoff posoKanei.md): the gov price source, and the current puzzle's photo
// credit (open-license / own — never the copyrighted gov image).

import { Modal } from "@/components/shared/Modal";
import { POSOKANEI } from "@/config/gameRules";
import { POSOKANEI_PRICE_ATTRIBUTION } from "@/games/posokanei/attribution";
import { btnModalSubmit } from "@/styles/recipes";

interface Props {
  isOpen:  boolean;
  onClose: () => void;
  /** The active puzzle's photo credit — "{source} — {license}". */
  photoCredit: string;
}

export function HowToPlayModal({ isOpen, onClose, photoCredit }: Props) {
  const maxPoints = POSOKANEI.POINTS_PER_GUESS_LEFT * POSOKANEI.MAX_GUESSES;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      closeLabel="Κλείσιμο"
      cardClassName="max-h-[90vh] overflow-y-auto"
    >
      <h2 className="text-lg font-bold text-foreground mb-1">Πώς να παίξεις</h2>
      <p className="text-xs text-muted mb-4 leading-relaxed">
        Βλέπεις ένα προϊόν του σούπερ μάρκετ. Μάντεψε την τιμή του σε{" "}
        {POSOKANEI.MAX_GUESSES} προσπάθειες.
      </p>

      <div className="space-y-4 text-sm text-foreground">
        <div className="space-y-1">
          <p className="font-semibold">🔼🔽 Στοιχεία μετά από κάθε λάθος</p>
          <p className="text-xs text-muted leading-relaxed">
            Κάθε λανθασμένη τιμή σού λέει αν η σωστή είναι <b>πιο πάνω</b> ή{" "}
            <b>πιο κάτω</b>, μαζί με ένα ποσοστό <b>εγγύτητας</b> — 100% σημαίνει
            ότι έπεσες ακριβώς πάνω.
          </p>
        </div>

        <div className="space-y-1">
          <p className="font-semibold">🎯 Νίκη</p>
          <p className="text-xs text-muted leading-relaxed">
            Κερδίζεις αν η τιμή σου πέσει αρκετά κοντά στην πραγματική (μέσα στο
            περιθώριο του προϊόντος).
          </p>
        </div>

        <div className="space-y-1">
          <p className="font-semibold">🏆 Πόντοι</p>
          <p className="text-xs text-muted leading-relaxed">
            Όσο νωρίτερα βρεις την τιμή, τόσο περισσότεροι πόντοι (έως {maxPoints}).
          </p>
        </div>

        <div className="space-y-1 text-[11px] text-muted leading-relaxed pt-2 border-t border-border">
          <p>
            <a href={POSOKANEI_PRICE_ATTRIBUTION.href} target="_blank" rel="noopener noreferrer" className="underline">
              {POSOKANEI_PRICE_ATTRIBUTION.text}
            </a>
            . Οι τιμές είναι παγωμένες στην ημερομηνία της πηγής — όχι τρέχουσες.
          </p>
          <p>Φωτογραφία: {photoCredit}</p>
        </div>
      </div>

      <button onClick={onClose} className={`mt-5 w-full ${btnModalSubmit}`}>
        Κατάλαβα!
      </button>
    </Modal>
  );
}
