"use client";

// How-to-play modal for Λογοπαίγνιο. Numbers derive from LOGOPAIGNIO in
// gameRules.ts. Carries the legal/attribution line: every mark is the trademark
// of its owner, shown here only for identification (nominative fair use) — plus
// the active puzzle's own credit line when it has one.

import { Modal } from "@/components/shared/Modal";
import { LOGOPAIGNIO } from "@/config/gameRules";
import { btnModalSubmit } from "@/styles/recipes";

interface Props {
  isOpen:  boolean;
  onClose: () => void;
  /** The active puzzle's mark credit / source, if any. */
  markCredit?: string;
}

export function HowToPlayModal({ isOpen, onClose, markCredit }: Props) {
  const maxPoints = LOGOPAIGNIO.POINTS_PER_GUESS_LEFT * LOGOPAIGNIO.MAX_GUESSES;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      closeLabel="Κλείσιμο"
      cardClassName="max-h-[90vh] overflow-y-auto"
    >
      <h2 className="text-lg font-bold text-foreground mb-1">Πώς να παίξεις</h2>
      <p className="text-xs text-muted mb-4 leading-relaxed">
        Βλέπεις το λογότυπο μιας ελληνικής εταιρείας — χωρίς το όνομά της. Μάντεψε
        ποια είναι σε {LOGOPAIGNIO.MAX_GUESSES} προσπάθειες.
      </p>

      <div className="space-y-4 text-sm text-foreground">
        <div className="space-y-1">
          <p className="font-semibold">🔎 Ξεθόλωμα</p>
          <p className="text-xs text-muted leading-relaxed">
            Το λογότυπο ξεκινά <b>θολό</b> και ξεθολώνει ένα βήμα σε κάθε
            λανθασμένη προσπάθεια. Ο <b>τομέας</b> της εταιρείας φαίνεται πάντα σαν
            βοήθεια.
          </p>
        </div>

        <div className="space-y-1">
          <p className="font-semibold">🎯 Νίκη</p>
          <p className="text-xs text-muted leading-relaxed">
            Γράψε το όνομα της εταιρείας. Δεν πειράζουν τόνοι, πεζά/κεφαλαία ή αν
            το γράψεις με ελληνικούς ή λατινικούς χαρακτήρες.
          </p>
        </div>

        <div className="space-y-1">
          <p className="font-semibold">🏆 Πόντοι</p>
          <p className="text-xs text-muted leading-relaxed">
            Όσο νωρίτερα (πιο θολό) τη βρεις, τόσο περισσότεροι πόντοι (έως {maxPoints}).
          </p>
        </div>

        <div className="space-y-1 text-[11px] text-muted leading-relaxed pt-2 border-t border-border">
          <p>
            Κάθε λογότυπο είναι εμπορικό σήμα του κατόχου του και εμφανίζεται εδώ
            μόνο για λόγους αναγνώρισης.
          </p>
          {markCredit && <p>Πηγή: {markCredit}</p>}
        </div>
      </div>

      <button onClick={onClose} className={`mt-5 w-full ${btnModalSubmit}`}>
        Κατάλαβα!
      </button>
    </Modal>
  );
}
