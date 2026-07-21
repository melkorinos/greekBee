"use client";

// TopothesiesGiveUpModal — confirmation prompt for giving up (mirrors the
// Leksokipos give-up pattern). Confirming ends the round; the revealed unit +
// capital are then shown by the finished-round result panel, so this modal only
// owns the Ναι / Άκυρο confirmation step.

import { Modal } from "@/components/shared/Modal";
import { btnCancel } from "@/styles/recipes";

interface TopothesiesGiveUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const dangerConfirm =
  "flex-1 py-2 rounded-control bg-danger text-white text-sm font-semibold hover:opacity-90 active:opacity-80 transition-opacity";

export function TopothesiesGiveUpModal({ isOpen, onClose, onConfirm }: TopothesiesGiveUpModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} closeLabel="Κλείσιμο">
      <h2 className="text-lg font-bold text-foreground mb-2">Παραίτηση;</h2>
      <p className="text-sm text-muted mb-6">
        Θα δεις την περιοχή και την πρωτεύουσά της. Είσαι σίγουρος/η;
      </p>
      <div className="flex gap-3">
        <button data-testid="btn-give-up-cancel" onClick={onClose} className={btnCancel}>
          Άκυρο
        </button>
        <button data-testid="btn-give-up-confirm" onClick={onConfirm} className={dangerConfirm}>
          Ναι, παραιτούμαι
        </button>
      </div>
    </Modal>
  );
}
