"use client";

// How-to-play modal for Vres Tin Frasi.
// Explains all four tile states with worked examples — emphasises purple vs yellow.

interface Props {
  isOpen:  boolean;
  onClose: () => void;
}

type ExColor = "correct" | "present" | "misplaced-word" | "absent" | "empty";

// A mini tile for the worked examples in the modal
function ExTile({ letter, color }: { letter: string; color: ExColor }) {
  const cls: Record<ExColor, string> = {
    correct:        "bg-correct  border-correct  text-white",
    present:        "bg-present  border-present  text-white",
    "misplaced-word": "bg-misplaced border-misplaced text-white",
    absent:         "bg-absent   border-absent   text-white",
    empty:          "bg-transparent border-border text-foreground",
  };
  return (
    <div
      className={`flex items-center justify-center w-9 h-9 border-2 rounded text-sm font-bold uppercase select-none ${cls[color]}`}
    >
      {letter}
    </div>
  );
}

// A mini word block
function ExWord({ tiles }: { tiles: Array<{ l: string; c: ExColor }> }) {
  return (
    <div className="flex gap-1">
      {tiles.map((t, i) => (
        <ExTile key={i} letter={t.l} color={t.c} />
      ))}
    </div>
  );
}

export function HowToPlayModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-2xl shadow-xl w-full max-w-sm p-6 relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 text-muted hover:text-foreground text-xl leading-none"
        >
          ✕
        </button>

        <h2 className="text-lg font-bold text-foreground mb-1">
          Πώς να παίξεις
        </h2>
        <p className="text-xs text-muted mb-4 leading-relaxed">
          Βρες τη φράση σε 6 προσπάθειες. Κάθε προσπάθεια πρέπει να έχει τον ίδιο αριθμό λέξεων
          και τα ίδια μήκη λέξεων με τη σωστή φράση.
        </p>

        <div className="space-y-5">
          {/* Green */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-correct flex-none" />
              <p className="text-sm font-semibold text-foreground">Πράσινο — σωστό γράμμα, σωστή θέση</p>
            </div>
            <div className="flex gap-2 items-center pl-5">
              <ExWord tiles={[
                { l: "κ", c: "correct" },
                { l: "α", c: "correct" },
                { l: "λ", c: "empty" },
                { l: "ε", c: "empty" },
              ]} />
              <ExWord tiles={[
                { l: "ψ", c: "empty" },
                { l: "υ", c: "correct" },
                { l: "χ", c: "empty" },
                { l: "η", c: "empty" },
              ]} />
            </div>
            <p className="text-xs text-muted pl-5">
              Τα γράμματα <strong className="text-foreground">Κ</strong>, <strong className="text-foreground">Α</strong> και <strong className="text-foreground">Υ</strong> είναι στη σωστή θέση μέσα στη λέξη τους.
            </p>
          </div>

          {/* Yellow */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-present flex-none" />
              <p className="text-sm font-semibold text-foreground">Κίτρινο — σωστό γράμμα, λάθος θέση (ίδια λέξη)</p>
            </div>
            <div className="flex gap-2 items-center pl-5">
              <ExWord tiles={[
                { l: "κ", c: "empty" },
                { l: "α", c: "present" },
                { l: "λ", c: "empty" },
                { l: "ε", c: "empty" },
              ]} />
            </div>
            <p className="text-xs text-muted pl-5">
              Το <strong className="text-foreground">Α</strong> υπάρχει σε αυτή τη λέξη αλλά σε διαφορετική θέση.
            </p>
          </div>

          {/* Purple */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-misplaced flex-none" />
              <p className="text-sm font-semibold text-foreground">Μοβ — σωστό γράμμα, ανήκει σε άλλη λέξη της φράσης</p>
            </div>
            <div className="flex gap-2 items-center pl-5">
              <ExWord tiles={[
                { l: "κ", c: "empty" },
                { l: "α", c: "empty" },
                { l: "λ", c: "misplaced-word" },
                { l: "ε", c: "empty" },
              ]} />
              <ExWord tiles={[
                { l: "ψ", c: "empty" },
                { l: "υ", c: "empty" },
                { l: "χ", c: "empty" },
                { l: "η", c: "empty" },
              ]} />
            </div>
            <p className="text-xs text-muted pl-5">
              Το <strong className="text-foreground">Λ</strong> υπάρχει στη φράση αλλά σε <em>διαφορετική λέξη</em> — όχι σε αυτή που το έγραψες.
            </p>
          </div>

          {/* Grey */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-absent flex-none" />
              <p className="text-sm font-semibold text-foreground">Γκρι — το γράμμα δεν υπάρχει στη φράση</p>
            </div>
            <div className="flex gap-2 items-center pl-5">
              <ExWord tiles={[
                { l: "σ", c: "absent" },
                { l: "ε", c: "empty" },
                { l: "λ", c: "empty" },
                { l: "ι", c: "empty" },
              ]} />
            </div>
            <p className="text-xs text-muted pl-5">
              Το <strong className="text-foreground">Σ</strong> δεν εμφανίζεται πουθενά στη φράση.
            </p>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-border">
          <p className="text-xs text-muted">
            💡 Μοβ ≠ κίτρινο: κίτρινο σημαίνει &quot;λάθος θέση στην ίδια λέξη&quot;,
            μοβ σημαίνει &quot;ανήκει σε άλλη λέξη της φράσης&quot;.
          </p>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full py-2.5 rounded-xl bg-inverted text-inverted-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Κατάλαβα!
        </button>
      </div>
    </div>
  );
}
