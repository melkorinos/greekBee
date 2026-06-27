// HowToPlayModal — Leksokipos rules modal.
// Thin wrapper around the shared HowToPlayModal primitive.

import { HowToPlayModal as SharedModal } from "@/components/shared/HowToPlayModal";

const TITLE = "Πώς να παίξεις — Leksokipos";

const ITEMS = [
  "Βρες όσες λέξεις μπορείς χρησιμοποιώντας τα 7 γράμματα.",
  "Κάθε λέξη πρέπει να περιέχει το **κεντρικό γράμμα**.",
  "Οι λέξεις πρέπει να έχουν τουλάχιστον **4 γράμματα**.",
  "Τα γράμματα μπορούν να χρησιμοποιηθούν **περισσότερες από μία φορές**.",
  "Μια λέξη που χρησιμοποιεί **και τα 7 γράμματα** κερδίζει επιπλέον bonus πόντους!",
  "Οι μεγαλύτερες λέξεις δίνουν περισσότερους πόντους.",
  "Πάτησε το εικονίδιο με τις **μπάρες** δίπλα στο επίπεδό σου για να δεις τους πόντους κάθε επιπέδου.",
  "Ανέβα στην κατάταξη από Ψαράκι μέχρι Απολυτότητα! 🌸",
];

export function HowToPlayModal() {
  return <SharedModal title={TITLE} items={ITEMS} bulletIcon="🌸" />;
}
