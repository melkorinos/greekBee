"use client";

// How-to-play modal for Leksodromia — the anagram sprint.
// All numbers shown here derive from LEKSODROMIA in gameRules.ts.

import { Modal } from "@/components/shared/Modal";
import { LEKSODROMIA } from "@/config/gameRules";
import { btnModalSubmit } from "@/styles/recipes";

interface Props {
  isOpen:  boolean;
  onClose: () => void;
}

const MIN_BASE = LEKSODROMIA.BASE_POINTS[4];
const MAX_BASE = LEKSODROMIA.BASE_POINTS[8];
const FLOOR_PERCENT = Math.round(LEKSODROMIA.FLOOR_RATIO * 100);
const TOTAL_WORDS   = LEKSODROMIA.LENGTHS.length * LEKSODROMIA.WORDS_PER_LENGTH;

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
        Ξεμπέρδεψε {TOTAL_WORDS} ανακατεμένες λέξεις — από {LEKSODROMIA.LENGTHS[0]} έως{" "}
        {LEKSODROMIA.LENGTHS[LEKSODROMIA.LENGTHS.length - 1]} γράμματα. Δεν υπάρχει
        χρονόμετρο αποτυχίας: όσο πιο γρήγορα λύσεις, τόσο περισσότερους πόντους παίρνεις.
      </p>

      <div className="space-y-4 text-sm text-foreground">
        <div className="space-y-1">
          <p className="font-semibold">⏱️ Οι πόντοι μειώνονται με τον χρόνο</p>
          <p className="text-xs text-muted leading-relaxed">
            Κάθε λέξη ξεκινά με πλήρεις πόντους ({MIN_BASE}–{MAX_BASE}, ανάλογα με το μήκος)
            και χάνει αξία για {LEKSODROMIA.DECAY_SECONDS} δευτερόλεπτα, μέχρι ένα ελάχιστο
            {" "}{FLOOR_PERCENT}% — ποτέ μηδέν. Ο χρόνος παγώνει όταν φύγεις από την καρτέλα.
          </p>
        </div>

        <div className="space-y-1">
          <p className="font-semibold">✅ Συμπλήρωσε όλα τα γράμματα</p>
          <p className="text-xs text-muted leading-relaxed">
            Μόλις γεμίσουν όλα τα κουτάκια, η λέξη υποβάλλεται αυτόματα. Λάθος λέξη;
            Τα γράμματα καθαρίζονται για να ξαναπροσπαθήσεις αμέσως. Μια λυμένη λέξη
            δίνει πάντα τουλάχιστον {LEKSODROMIA.MIN_SOLVED_POINTS} πόντους.
          </p>
        </div>

        <div className="space-y-1">
          <p className="font-semibold">⏭️ Επόμενο — με δεύτερη ευκαιρία</p>
          <p className="text-xs text-muted leading-relaxed">
            Αν κολλήσεις, προχώρα — η λέξη επιστρέφει στο τέλος του γύρου για μια
            δεύτερη ευκαιρία. Το ρολόι της συνεχίζει από εκεί που το άφησες. Αν την
            παραλείψεις και δεύτερη φορά, μετράει 0 πόντους οριστικά.
          </p>
        </div>

        <div className="space-y-1">
          <p className="font-semibold">🏆 Τέλειος γύρος: {LEKSODROMIA.MAX_SCORE} πόντοι</p>
          <p className="text-xs text-muted leading-relaxed">
            Ίδιο παζλ και ίδιο ανακάτεμα για όλους κάθε μέρα — δίκαιος πίνακας σκορ.
          </p>
        </div>
      </div>

      <button
        onClick={onClose}
        className={`mt-5 w-full ${btnModalSubmit}`}
      >
        Κατάλαβα!
      </button>
    </Modal>
  );
}
