"use client";

// How-to-play modal for Topothesies — the geography game.
// All numbers derive from TOPOTHESIES in gameRules.ts. The CC-BY attribution is
// a license obligation (ADR 0018), rendered here verbatim from its constant.

import { Modal } from "@/components/shared/Modal";
import { TOPOTHESIES } from "@/config/gameRules";
import { TOPOTHESIES_ATTRIBUTION } from "@/games/topothesies/attribution";
import { btnModalSubmit } from "@/styles/recipes";

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
        Βλέπεις το σχήμα μιας ελληνικής περιφερειακής ενότητας ή ενός νησιού.
        Μάντεψε ποια περιοχή είναι — έχεις {TOPOTHESIES.SHAPE_GUESSES} προσπάθειες.
      </p>

      <div className="space-y-4 text-sm text-foreground">
        <div className="space-y-1">
          <p className="font-semibold">🧭 Στοιχεία μετά από κάθε λάθος</p>
          <p className="text-xs text-muted leading-relaxed">
            Κάθε λανθασμένη απάντηση δείχνει πόσο μακριά είσαι (σε χιλιόμετρα), ένα
            βέλος προς τη σωστή περιοχή, και ένα ποσοστό εγγύτητας — 100% σημαίνει
            ότι έπεσες ακριβώς πάνω.
          </p>
        </div>

        <div className="space-y-1">
          <p className="font-semibold">🏛️ Μπόνους: η πρωτεύουσα</p>
          <p className="text-xs text-muted leading-relaxed">
            Μόλις λυθεί το σχήμα (ή εξαντληθούν οι προσπάθειες), αποκαλύπτεται η
            περιοχή και μπορείς να μαντέψεις την πρωτεύουσά της για επιπλέον πόντους
            — {TOPOTHESIES.CAPITAL_GUESSES} προσπάθειες, με τα ίδια στοιχεία απόστασης.
          </p>
        </div>

        <div className="space-y-1">
          <p className="font-semibold">🎯 Πόντοι</p>
          <p className="text-xs text-muted leading-relaxed">
            Όσο νωρίτερα βρεις την περιοχή, τόσο περισσότεροι πόντοι
            (έως {TOPOTHESIES.POINTS_PER_SHAPE_GUESS_LEFT * TOPOTHESIES.SHAPE_GUESSES}).
            Η πρωτεύουσα δίνει μπόνους
            (έως {TOPOTHESIES.POINTS_PER_CAPITAL_GUESS_LEFT * TOPOTHESIES.CAPITAL_GUESSES}).
          </p>
        </div>

        <p className="text-[11px] text-muted leading-relaxed pt-2 border-t border-border">
          <a href={TOPOTHESIES_ATTRIBUTION.href} target="_blank" rel="noopener noreferrer" className="underline">
            {TOPOTHESIES_ATTRIBUTION.text}
          </a>
        </p>
      </div>

      <button onClick={onClose} className={`mt-5 w-full ${btnModalSubmit}`}>
        Κατάλαβα!
      </button>
    </Modal>
  );
}
